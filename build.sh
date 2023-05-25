echo about to copy package json file
cp package.json. / dist / package.json
echo creating config folder in dist
mkdir ./dist/config
echo going to copy env file
echo  "Enviroment type(dev/test/prod) : "
read env
if [ "$env" = "dev" ]; then
            cp ./config/dev.properties ./config/env.properties
            elif  [ "$env" == "test" ] ; then
                cp ./config/test.properties ./config/test.properties
                elif  [ "$env" == "prod" ]; then        
                    cp ./config/prod.properties ./config/env.properties
                    else 
                    cp ./config/dev.properties ./config/env.properties   
fi
cp ./config/env.properties ./dist/config/env.properties
echo going to install node modules
npm install
echo going to build code and start server
npm run build