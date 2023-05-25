import http from 'http';
import express from 'express';
import indexRouter from './routes/index';
import bodyParser from 'body-parser';
import compression from 'compression';
import { sendLogToSlack } from './slackAPI/slack';
import { cronJob, revalidationcronJob } from './crossplatCommonSrc/schedule';
import { bot } from './slackAPI/bot';
import { slashBot } from './slackAPI/slashCmds';
import { methods as flsmData } from './flsm/flsm'
import { flsmjob } from './flsm/flsm';
const cron = require("node-cron");
const path = require("path");

// slack api
const { createEventAdapter } = require('@slack/events-api');
const { createMessageAdapter } = require('@slack/interactive-messages');
const { cloneDeep } = require('lodash');
// const bot = require('./slackAPI/bot');
const slackEvents = createEventAdapter('23505e931db0f363a555886b823894f2');
slackEvents.on('message', (event) => {
  try {
    if (event.bot_profile || event.subtype === 'message_changed') {
      return;
    } else if ((event.text.substr(0, 21) === 'eva create access for' || event.text.substr(0, 21) === 'eva modify access for') && (event.text.indexOf('<@') !== -1)) {
      event.triUser = event.user
      // event.user = (event.text.substr(22, 32).substr(2, 9))
      event.user = (event.text.substr(22, 32).replace(/[^a-zA-Z0-9]/g, ''))
      bot.handleDirectMessage(event);
    } else {
      bot.handleAnyMessage(event)
    }
  } catch (err) {
    console.log(err)
  }

});
// --- Slack Interactive Messages ---
const slackInteractions = createMessageAdapter('23505e931db0f363a555886b823894f2');
slackEvents.on('error', console.error);

function findAttachment(message, actionCallbackId, dropType) {
  if (dropType === 0) {
    return message.attachments.find(a => a.callback_id === actionCallbackId);
  }
  else {
    return message.attachments.find(a => a.blocks ? a.blocks[0].block_id === actionCallbackId : a.callback_id === actionCallbackId);
  }
}

function acknowledgeActionFromMessage(originalMessage, actionCallbackId, ackText, dropType) {
  const message = cloneDeep(originalMessage);
  const attachment = findAttachment(message, actionCallbackId, dropType);
  if (dropType === 0) {
    delete attachment.actions;
  } else {
    delete attachment.blocks
  }
  attachment.text = `:heavy_check_mark: ${ackText}`;
  return message;
}


function findSelectedOption(originalMessage, actionCallbackId, selectedValue, dropType) {
  const attachment = findAttachment(originalMessage, actionCallbackId, dropType);
  if (dropType === 0)
    return attachment.actions[0].options.find(o => o.value === selectedValue);
  else {
    return selectedValue
  }
}

// Action handling

slackInteractions.action('modify:start', (payload, respond) => {
  // Create an updated message that acknowledges the user's action (even if the result of that
  // action is not yet complete).
  const updatedMessage = acknowledgeActionFromMessage(payload.original_message, 'modify:start',
    'I\'m getting the request started for you.', 0);

  // Start an order, and when that completes, send another message to the user.
  bot.startOrder(payload.user.id)
    .then(respond)
    .catch(console.error);

  // The updated message is returned synchronously in response
  return updatedMessage;
});

slackInteractions.action('modify:select_userCategory', (payload, respond) => {
  const selectedType = findSelectedOption(payload.original_message, 'modify:select_userCategory', payload.actions[0].selected_options[0].value, 0);
  const updatedMessage = acknowledgeActionFromMessage(payload.original_message, 'modify:select_userCategory',
    `You chose  *${selectedType.text}* for User Category.`, 0);
  bot.selectTypeForOrder(payload.user.id, selectedType.value, selectedType.text)
    .then((response) => {
      // Keep the context from the updated message but use the new text and attachment
      updatedMessage.text = response.text;
      if (response.attachments && response.attachments.length > 0) {
        updatedMessage.attachments.push(response.attachments[0]);
      }
      return updatedMessage;
    })
    .then(respond)
    .catch(console.error);

  return updatedMessage;
});

slackInteractions.action('modify:select_usrGMSubCat', (payload, respond) => {
  const optionName = payload.actions[0].name;
  const selectedChoice = findSelectedOption(payload.original_message, 'modify:select_usrGMSubCat', payload.actions[0].selected_options[0].value, 0);
  const updatedMessage = acknowledgeActionFromMessage(payload.original_message, 'modify:select_usrGMSubCat',
    `You chose *${selectedChoice.text}* for User Global Market Sub Category`, 0);
  bot.selectOptionForOrder(payload.user.id, optionName, selectedChoice.value, selectedChoice.text)
    .then((response) => {
      // Keep the context from the updated message but use the new text and attachment
      updatedMessage.text = response.text;
      if (response.attachments && response.attachments.length > 0) {
        updatedMessage.attachments.push(response.attachments[0]);
      }
      return updatedMessage;
    })
    .then(respond)
    .catch(console.error);

  return updatedMessage;
});


slackInteractions.action({ type: 'multi_static_select' }, (payload, respond) => {
  var callback_id = ''
  var userDrop = ''
  if (payload.actions[0].block_id === 'modify:usr_geos') {
    callback_id = 'modify:usr_geos'
    userDrop = 'Geography'
  } else if (payload.actions[0].block_id === 'modify:usr_markt') {
    callback_id = 'modify:usr_markt'
    userDrop = 'Market'
  } else {
    callback_id = 'modify:usr_bu'
    userDrop = 'Business Unit'
  }
  const selectedType = findSelectedOption(payload.message, callback_id, payload.actions[0].selected_options, 1);
  var selectedText = ''
  selectedType.map((opt, index) => {
    if (selectedType.length - 1 === index) {
      selectedText += opt.text.text
    } else {
      selectedText += opt.text.text + ','
    }
  })
  const updatedMessage = acknowledgeActionFromMessage(payload.message, callback_id,
    `You chose  *${selectedText}* for User ${userDrop}.`, 1);
  if (callback_id === 'modify:usr_geos') {
    bot.selectedUserGeoMul(payload.user.id, selectedType, selectedText)
      .then((response) => {
        // Keep the context from the updated message but use the new text and attachment
        // updatedMessage.text = response.text;
        if (response.attachments && response.attachments.length > 0) {
          updatedMessage.attachments.push(response.attachments[0]);
        }
        return updatedMessage;
      })
      .then(respond)
      .catch(console.error);
  } else if (callback_id === 'modify:usr_markt') {
    bot.selectedUserMarkMul(payload.user.id, selectedType, selectedText)
      .then((response) => {
        // Keep the context from the updated message but use the new text and attachment
        // updatedMessage.text = response.text;
        if (response.attachments && response.attachments.length > 0) {
          updatedMessage.attachments.push(response.attachments[0]);
        }
        return updatedMessage;
      })
      .then(respond)
      .catch(console.error);
  } else {
    var userId;
    bot.selectedUserBUMul(payload.user.id, selectedType, selectedText)
      .then((response) => {
        // Keep the context from the updated message but use the new text and attachment
        updatedMessage.text = response.text;
        userId = response.usrData
        if (response.attachments && response.attachments.length > 0) {
          updatedMessage.attachments.push(response.attachments[0]);
        }
        return updatedMessage;
      })
      .then(respond).then((res) => {
        bot.deleteUniqUser(userId)
      })
      .catch(console.error);
  }

})
slackInteractions.action('modify:select_userRole', (payload, respond) => {
  const selectedType = findSelectedOption(payload.original_message, 'modify:select_userRole', payload.actions[0].selected_options[0].value, 0);
  const updatedMessage = acknowledgeActionFromMessage(payload.original_message, 'modify:select_userRole',
    `You chose  *${selectedType.text}* for User Role.`, 0);
  bot.selectedUserRole(payload.user.id, selectedType.value, selectedType.text)
    .then((response) => {
      // Keep the context from the updated message but use the new text and attachment
      updatedMessage.text = response.text;
      if (response.attachments && response.attachments.length > 0) {
        updatedMessage.attachments.push(response.attachments[0]);
      }
      return updatedMessage;
    })
    .then(respond)
    .catch(console.error);

  return updatedMessage;
});
slackInteractions.action({ type: 'static_select' }, (payload, respond) => {
  if (payload.message) {
    if (payload.message.attachments[0].blocks[0].text.text === 'Select') {
      bot.introduceToUser(payload.actions[0].action_id, payload.actions[0].block_id, payload.actions[0].selected_option.value)
    }
  } else {
    if(payload.actions[0].action_id==='/evagetmykpis'){
      if(payload.actions[0].block_id.indexOf('profileDrop#')>-1){
        payload.actions[0].block_id=payload.actions[0].block_id.split('#')[1]
        slashBot.introduceProfilesToUser(payload.actions[0],1)
      }else{
        slashBot.introduceProfilesToUser(payload.actions[0],0)
      }
    }else{  
      slashBot.introduceToUser(payload.actions[0])
    }
  }
  respond({ "delete_original": "true", text: `In ${payload.actions[0].selected_option.value}` })
})

slackInteractions.action({ type: 'datepicker' }, (payload, respond) => {
    slashBot.usageLogs(payload.actions[0])
    respond({"delete_original": "true",text:`The Logs are..`})
})
// slack api
const port = 4000;
const app = express();

app.use(compression({
  "level": 9
}));
app.use('/slack/events', slackEvents.expressMiddleware());
app.use('/slack/actions', slackInteractions.requestListener());
// create application/json parser
app.use(bodyParser.json());
// create application/x-www-form-urlencoded parser
app.use(bodyParser.urlencoded({
  extended: true
}));

let allowCrossDomain = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-type, authorization');
  next();
};
//to escape SSL verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

app.use(allowCrossDomain);



//routes
app.all('/*', indexRouter);
app.use((err, req, res, next) => {
  sendLogToSlack(1, err, req, res)
});

const ABSPATH = path.dirname(process.mainModule.filename);
//for CBN validation
app.get('/landingpage', function (req, res) {
  app.use('/wireframe.css', express.static(path.join(ABSPATH + '/bundle/wireframe.css')))
  app.use('/banner_new.png', express.static(path.join(ABSPATH + '/bundle/banner_new.png')))
  res.sendFile(path.resolve(ABSPATH + '/bundle/cbn.html'))
});


http.createServer(app).listen(port, () => {
  cronJob.start();
  revalidationcronJob.start();
  console.log(`server listening on port ${port}`);
});

// app.listen(port, function () {
//   cronJob.start();
// });

cron.schedule("00 48 08 * * 0-6", async function () {
  try{
    console.log('Schedule start');
    await flsmData.downloadFile();
    console.log('insertflsmEmail');
    await flsmData.deleteRecordFLSMuserTable();
    //await flsmData.createTable();
    //await flsmData.deleteRecordFLSMuserTable();
    console.log('0-------------------');
    await flsmData.updateFLSMuserTable();
    console.log('1-------------------');
    await flsmData.recordCount();
    console.log('------');
    console.log('Record count')
    await flsmData.updateFLSMaccessProf();
    console.log('3-------------------');
     await flsmData.updateSDSaccessProf();
     console.log('4-------------------');
    // await flsmData.updateFLSMuser();
    console.log('schedule End');
  }catch(err){
    console.log(err);
  }
});
export default app;