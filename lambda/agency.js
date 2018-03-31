'use strict';
const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');
const validator = require('email-validator')
const R = require('ramda');
AWS.config.setPromisesDependency(require('bluebird'));
const dynamoDb = new AWS.DynamoDB.DocumentClient({convertEmptyValues: true});

//method:post path: /admin/agency 
module.exports.register = (event, context, callback) => {
    //Add new Agency Code goes here
    try{
        console.log("Receieved request to Add Agency details. Event is", event);
        var body = JSON.parse(event.body);   //Enable for API/ Disable for Lambda Tests
        //var body = event.body  //Enable for Lambda/ Disable for API Tests
        const AgencyID = uuidv4(); 
        const agency = agencyinfo(body,AgencyID);
        const contacts = agencycontactsinfo(body, AgencyID);
        
    
        //console.log("contacts:", JSON.stringify(contacts));
        const AgencySubmissionFx = R.composeP(submitAgencyPhoneP,submitAgencyP,checkAgencyExistsP);
        AgencySubmissionFx(agency)
        .then(res => {
            const response = agencyResponseInfo(agency);
            response.agency.contacts = [{}];
            response.messages = [{}];
            var successfullContacts = [];
            console.log(`Successfully Registered Agency: ${body.agency_name}  into the system`);
            for(var count=0; count < contacts.length; count++)
            {
                var contact = contacts[count];
                submitSingleContact(contact)
                .then(res =>{
                    var Addedcontact = res;
                    console.log("Added Contact:", Addedcontact);
                    response.agency.contacts.push(res);
                    
                    console.log('I am here yahoo!', res);
                    console.log('successfully added contact', res.first_name + ' ' + res.last_name);
                })
                .catch(err => {
                    var message = `unable to add contact  ${contact.first_name}  ${contact.last_name} : ${err})` 
                    console.log('unable to add contact', contact.first_name + ' ' + contact.last_name + ' ' + err);
                    response.messages.push(message);
                    //return Promise.reject(new Error('Couldn\'t add Agency contact because of validation errors.'));
                    // deleteAgency(agency);
                    // callback(null, failureResponseBuilder(
                    //     409,
                    //     JSON.stringify({
                    //         message: `Unable to add contact: ${err}`
                    //     })
                    // ));
                });
            }
            console.log("Successful Contacts:", successfullContacts);
            //response.agency.contacts = successfullContacts;
            response.messages.push("Successfully registered Agency!");
            callback(null, successResponseBuilder(JSON.stringify(response)));
            })
            .catch(err => {
                console.error('Failed to register Agency with the system', err);
                callback(null, failureResponseBuilder(
                    409,
                    JSON.stringify({
                        message: `Unable to register Agency ${body.agency_name}: ${err}`
                    })
                ))
            });
    }
    catch(err){
        
        callback(null, failureResponseBuilder(
            409,
            JSON.stringify({
                message: `Internal Server Error; Unable to register Agency ${body.agency_name}`,
                event: event,
                error: err
            })
        ))
                    
    }
};

//method: get path: /admin/agency/{id}
module.exports.get = (event, context, callback) => {
    //Get the details of a particular agency record code goes here
};

//method: get path: /admin/agencies
module.exports.list = (event, context, callback) => {
    //Get a list of all agencies goes here
};

//method: put path: /admin/agency/{id}
module.exports.update = (event, context, callback) => {
    //update a particular agency record goes here
};

//method post /admin/agency/{id}/contact
module.exports.addcontact = (event, context, callback) => {
    //add agency contact code goes here
};

//method put /admin/contact/{id}
module.exports.updatecontact = (event, context, callback) => {
    //update agency contact goes here
};

//method: update path: /admin/agency/{id}/contacts
module.exports.listcontacts = (event, context, callback) => {
    //update agency contacts goes here
};

//method: delete path: /admin/agency/{id}
module.exports.remove = (event, context, callback) => {
    //delete an agency code  goes here
    //we need to delete agency contact details too
};

//method delete /admin/agencies
module.exports.removeall = (event, context, callback) => {
    //delete all agencies code  goes here
    //we need to delete agency contact details too
};

//method delete /admin/agency/contact/{id}
module.exports.removecontact = (event, context, callback) => {
    //update agency contacts goes here
};

//method delete /admin/agency/{id}/contacts
module.exports.removeallcontacts = (event, context, callback) => {
    //delete all contacts for a particular agency
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

const agencyinfo = (body,agencyID) => {
    const timestamp = Date.now();     
    return {
        agency_id: agencyID,
        agency_name: body.agency_name,
        address: body.address,
        city: body.city, 
        state: body.state,
        zipcode: body.zipcode,
        contact_number: body.contact_number,
        status: 1,         
        created_on: timestamp,
        updated_on: timestamp,
    };
};

const agencycontactsinfo = (body, agencyID) => {
    var contacts = [{}];
    for(var count=0;count < body.contacts.length; count++){
        contacts.push(contactinfo(body.contacts[count],agencyID));
    }
    return contacts;
};

const contactinfo = (contact, agencyID) =>{
    var contactID = uuidv4();
    return{
        id: contactID, 
        agency_id: agencyID,       
        first_name: contact.first_name,
        last_name: contact.last_name,
        middle_name: contact.middle_name,
        mobile: contact.mobile,
        access_status: contact.access_status,
        email: contact.email,
        type: contact.type || 1,        
    }
};

const contactresult = (contact) =>{
    return{
        id: contact.id, 
        agency_id: contact.agency_id,       
        first_name: contact.first_name,
        last_name: contact.last_name,
        middle_name: contact.middle_name,
        mobile: contact.mobile,
        access_status: contact.access_status,
        email: contact.email,
        type: contact.type,        
    }
};

const agencyResponseInfo = (agency) =>{
    const contacts = [{}];
    return {
        agency:{
            agency_id: agency.agency_id,
            agency_name: agency.agency_name,
            address: agency.address,
            city: agency.city, 
            state: agency.state,
            zipcode: agency.zipcode,
            contact_number: agency.contact_number,
            status: agency.status,         
            created_on: agency.created_on,
            updated_on: agency.updated_on,
            contacts: contacts,
        },
        messages: [],
    }
};

const submitAgencyP = (agency) => {
    console.log('submitAgencyP() adding Agency info to DynamoDb table', process.env.AGENCY_TABLE);
    if(typeof agency.agency_name !== 'string' || typeof agency.address !== 'string' || typeof agency.city !== 'string' || typeof agency.zipcode !== 'number' || agency.contact_number === null){
          console.error('Validation Failed');
          return Promise.reject(new Error('Couldn\'t register Agency because of validation errors.'));   
    }  
    const agencyItem = {
        TableName: process.env.AGENCY_TABLE,
        Item: agency,
    };
    console.log("Agency Record:" , agency);
    return dynamoDb.put(agencyItem)
        .promise()
        .then(res => agency);
};

const submitSingleContact = (contact) => {
    console.log("Adding single contact to ", process.env.AGENCY_CONTACT_DETAIL_TABLE);
    if(typeof contact.first_name !== 'string' || typeof contact.last_name !== 'string' || validator.validate(contact.email) === false || contact.agency_id === null){
        console.error('Validation Failed');
        //messages.push(`Couldn\'t update Agency contact ${contact.first_name}  ${contact.last_name}  ${contact.email} because of validation errors.`);
        return Promise.reject(new Error(`Couldn\'t update Agency contact ${contact.first_name}  ${contact.last_name}  ${contact.email} because of validation errors.`));   
    }  
    const contactItem = {
        TableName: process.env.AGENCY_CONTACT_DETAIL_TABLE,
        Item: contact,
    };
    console.log("Dynamo DB Call to add a single contact follows:");
    return dynamoDb.put(contactItem)
        .promise()
        .then(res => contact);
};

const checkAgencyExistsP = (agency) => {
    console.log('Checking if Agency already exists...');
    const query = {
        TableName: process.env.AGENCY_PHONE_INFO_TABLE,
        Key: {
            "contact_number": agency.contact_number
        }
    };
    return dynamoDb.get(query)
        .promise()
        .then(res => {
            if (R.not(R.isEmpty(res))) {
                return Promise.reject(new Error(`Agency already exists with contact number ${agency.contact_number}`));
            }
            return agency;
    });
};

const submitAgencyPhoneP = (agency) => {
    console.log('Submitting agency contact number');
    const agencyPhoneInfo = {
        TableName: process.env.AGENCY_PHONE_INFO_TABLE,
        Item: {
            agency_id: agency.agency_id,
            contact_number: agency.contact_number
        },
    };
    return dynamoDb.put(agencyPhoneInfo)
        .promise();
  }

  const deleteAgency = (agency) => {
    const agencyPhoneInfo = {
        TableName: process.env.AGENCY_PHONE_INFO_TABLE,
        Item: {
            agency_id: agency.agency_id,
            contact_number: agency.contact_number
        },
    };
    dynamoDb.delete(agencyPhoneInfo)
        .promise();

    const agencyItem = {
        TableName: process.env.AGENCY_TABLE,
        Item: {
            agency_id: agency.agency_id,
            contact_number: agency.contact_number
        },
    };
    dynamoDb.delete(agencyItem)
        .promise();  

    const agencyDetailItem = {
        TableName: process.env.AGENCY_CONTACT_DETAIL_TABLE,
        ConditionExpression:"agency_id = :val",
        ExpressionAttributeValues: {
            ":val":agency.agency_id,}
    };
    dynamoDb.delete(agencyDetailItem)
        .promise();                    
  };