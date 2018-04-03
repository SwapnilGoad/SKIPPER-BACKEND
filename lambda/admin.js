'use strict';
const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');
const validator = require('email-validator')
const R = require('ramda');
AWS.config.setPromisesDependency(require('bluebird'));
const dynamoDb = new AWS.DynamoDB.DocumentClient({convertEmptyValues: true});

//method: get path: /admin/agency/{id}
module.exports.login = (event, context, callback) => {
   //Get the details of a particular agency record code goes here 
    try{
        var body = JSON.parse(event.body);
        
        var params = {
            TableName: process.env.ADMIN_TABLE,
            Key:{
                "user_name": body.user_name
                //"password": body.password
            }
        };

        dynamoDb.get(params, function(error, data) {
            if (error) {
            callback(error);
            }else{
                if(Object.keys(data).length == 0){
                    //callback(error,{'message':'Incorrect user name or password ','success':'4'});
                    callback(null, successResponseBuilder(JSON.stringify({'message':'Incorrect user name or password ','success':'4'})));
                }else{
                    var password= data.Item.password;
                    if(password == body.password){
                        callback(null, successResponseBuilder(JSON.stringify({'user':{'user_name': data.Item.user_name, 'password': data.Item.password,'status':data.Item.status},'success':'1'})));
                    }else{
                    //callback(error,{'message':'Incorrect user name or password ','success':'4'}); 
                    callback(null, successResponseBuilder(JSON.stringify({'message':'Incorrect user name or password ','success':'4'})));
                    }
                
                }
            }
            // callback(error, data);
        
        
        });

    }catch(error)
    {
        callback(null, failureResponseBuilder(
            409,
            JSON.stringify({
                message: `Internal Server Error`,
                event: event,
                error: error
            })
        ))
    }

};


const successResponseBuilder = (body) => {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: body
    };
};
  
const failureResponseBuilder = (statusCode, body) => {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: body
    };
};
