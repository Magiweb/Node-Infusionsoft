module.exports = function( consumerKey, consumerSecret, callbackURL ) {

    var qs = require( 'querystring' ), js2xmlparser = require( "js2xmlparser" ), url = 'https://api.infusionsoft.com/crm/xmlrpc/v1?access_token=', request = require( 'request' ), loginUrl = 'https://signin.infusionsoft.com/app/oauth/authorize?';
    tokenUrl = 'https://api.infusionsoft.com/token';

    return {
        /*
         * Returns oauth_token_secret and oauth_token via callback on success
         *
         * Example: requestToken(function(err, response){
         *  var token = response.oauth_token;
         *  var tokenSecret = response.oauth_token_secret;
         * });
         */
        getUrl              : function() {

            var params = {
                client_id    : consumerKey,
                response_type: 'code',
                redirect_uri : callbackURL,
                scope        : 'full'
            };

            return loginUrl + qs.stringify( params );
        },
        requestToken        : function( code, callback ) {
            var params = {
                client_id    : consumerKey,
                client_secret: consumerSecret,
                code         : code,
                grant_type   : 'authorization_code',
                redirect_uri : callbackURL
            };

            request.post(
                {
                    url : tokenUrl,
                    form: params
                }, function( error, response, body ) {

                    if( error ) {
                        callback( error, false );
                    } else {
                        callback( error, JSON.parse( response.body ) );
                    }

                }
            );

        },
        refreshToken        : function( token, callback ) {
            var params = {
                refresh_token: token,
                grant_type   : 'refresh_token'
            }, headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization : 'Basic ' + new Buffer( consumerKey + ':' + consumerSecret ).toString( 'base64' )
            };
            request.post(
                {
                    url    : tokenUrl,
                    form   : params,
                    headers: headers
                }, function( error, response, body ) {

                    var responseObj = JSON.parse( response.body );

                    if( error ) {
                        callback( responseObj.error, false );
                    } else if( responseObj.error ) {
                        callback( responseObj, false );
                    } else {
                        callback( error, JSON.parse( response.body ) );
                    }
                }
            );
        },
        addContact          : function( token, contacts, callback ) {
            var data = {
                methodName: 'ContactService.add',
                params    : {
                    param: [
                        {
                            value: {
                                string: token
                            }
                        }, {
                            value: {
                                struct: {
                                    member: [
                                        {
                                            name : 'FirstName',
                                            value: {
                                                string: contacts.name
                                            }
                                        }, {
                                            name : 'LastName',
                                            value: {
                                                string: contacts.name
                                            }
                                        }, {
                                            name : 'Email',
                                            value: {
                                                string: contacts.email
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    ]
                }
            };

            var xml = js2xmlparser( "methodCall", data );
            request.post(
                {
                    url    : url + token,
                    body   : xml,
                    headers: { 'Content-Type': 'application/xml' }
                }, function( error, response, body ) {
                    if( error ) {
                        callback( error, false );
                    } else {

                        var xml2js = require( 'xml2js' ), parser = new xml2js.Parser();

                        parser.parseString(
                            response.body, function( err, result ) {

                                if( err ) {
                                    callback( error, false );
                                } else {
                                    callback( error, { id: result.methodResponse.params[ 0 ].param[ 0 ].value[ 0 ].i4[ 0 ] } );
                                }
                            }
                        );

                    }
                }
            );
        },
        getCompainsList     : function( token, callback ) {
            var data = {
                methodName: 'DataService.query',
                params    : {
                    param: [
                        {
                            value: {
                                string: token
                            }
                        }, {
                            value: {
                                string: 'ContactGroup'
                            }
                        }, {
                            value: {
                                int: 1000
                            }
                        }, {
                            value: {
                                int: 0
                            }
                        }, {
                            value: {
                                struct: {
                                    member: {
                                        name : 'Id',
                                        value: {
                                            string: '%'
                                        }
                                    }
                                }
                            }
                        }, {
                            value: {
                                array: {
                                    data: {
                                        value: [
                                            {
                                                string: 'Id'
                                            }, {
                                                string: 'GroupName'
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                }
            };

            var xml = js2xmlparser( "methodCall", data );

            request.post(
                {
                    url    : url + token,
                    body   : xml,
                    headers: { 'Content-Type': 'application/xml' }
                }, function( error, response, body ) {

                    if( error ) {
                        callback( error, false );
                    }

                    var xml2js = require( 'xml2js' ), parser = new xml2js.Parser();

                    parser.parseString(
                        response.body, function( err, result ) {

                            if( err ) {
                                callback( error, false );
                            } else {

                                var arResponse = result.methodResponse.params[ 0 ].param[ 0 ].value[ 0 ].array[ 0 ].data[ 0 ].value, returnObj = [];

                                arResponse.forEach(
                                    function( value, key ) {
                                        var data = {};
                                        value.struct[ 0 ].member.forEach(
                                            function( value, key ) {
                                                switch( value.name[ 0 ] ) {
                                                    case "Id":
                                                        data.id = value.value[ 0 ].i4[ 0 ];
                                                        break;
                                                    case "GroupName":
                                                        data.name = value.value[ 0 ];
                                                        break;
                                                }
                                            }
                                        );
                                        returnObj.push( data );
                                    }
                                );
                                callback( false, returnObj );
                            }
                        }
                    );
                }
            );
        },
        addContactToCampaing: function( token, contactId, campaingId, callback ) {
            var data = {
                methodName: 'ContactService.addToGroup',
                params    : {
                    param: [
                        {
                            value: {
                                string: token
                            }
                        }, {
                            value: {
                                int: contactId
                            }
                        }, {
                            value: {
                                int: campaingId
                            }
                        }
                    ]
                }
            };

            var xml = js2xmlparser( "methodCall", data );

            request.post(
                {
                    url    : url + token,
                    body   : xml,
                    headers: { 'Content-Type': 'application/xml' }
                }, function( error, response, body ) {

                    if( error ) {
                        callback( error, false );
                    }

                    var xml2js = require( 'xml2js' ), parser = new xml2js.Parser();

                    parser.parseString(
                        response.body, function( err, result ) {
                            if( result.methodResponse.fault ) {
                                var fault = result.methodResponse.fault[ 0 ].value[ 0 ].struct;
                                var error = [];
                                fault.forEach(
                                    function( value1, key1 ) {
                                        var faultCode = 0;
                                        var faultString = "Unknown error!";
                                        value1.member.forEach(
                                            function( value2, key2 ) {
                                                switch( value2.name[ 0 ] ) {
                                                    case "faultCode":
                                                        faultCode = value2.value[ 0 ].i4[ 0 ];
                                                        break;
                                                    case "faultString":
                                                        faultString = value2.value[ 0 ];
                                                        break;
                                                }
                                            }
                                        );
                                        error.push(
                                            {
                                                code   : faultCode,
                                                message: faultString
                                            }
                                        );
                                    }
                                );
                                return callback( error, false );
                            }

                            callback( false, true );
                        }
                    );
                }
            );
        },
        addCustomField      : function( token, listId, label, callback ) {

            var data = {
                methodName: 'DataService.addCustomField',
                params    : {
                    param: [
                        {
                            value: {
                                string: token
                            }
                        }, {
                            value: {
                                string: 'Contact'
                            }
                        }, {
                            value: {
                                string: label
                            }
                        }, {
                            value: {
                                string: 'Text'
                            }
                        }, {
                            value: {
                                int: listId
                            }
                        }
                    ]
                }
            };

            var xml = js2xmlparser( "methodCall", data );

            request.post(
                {
                    url    : url + token,
                    body   : xml,
                    headers: { 'Content-Type': 'application/xml' }
                }, function( error, response, body ) {

                    if( error ) {
                        callback( error, false );
                    }

                }
            );
        }
    };
};
