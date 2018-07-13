window.WinthorPush = (function(){
    "use strict";

    var _Logado = null;
    var _WinthorPush = function(cometParam) {
        var comet = cometParam;

        this.subscribe = (canal, callback) => {
            console.log('-> subscribe: ' + canal);
            comet.subscribe(canal, callback);

            _getUsuarioLogado().then(function(result) {
                //console.log('-> usuario: ' + JSON.stringify(result));

                if (result) {
                    var tenant = '';
                    if (result.tenant && result.tenant != '') {
                        tenant = '/' + result.tenant;
                        const chanel1 = canal + tenant;
                        comet.subscribe(chanel1, callback);
                        console.log(chanel1);
                    }
    
                    var perfil = '';
                    if (result.codPerfil && !isNaN(result.codPerfil)) {
                        perfil = '/' + result.codPerfil;
                        const chanel2 = canal + tenant + perfil;
                        comet.subscribe(chanel2, callback);
                        console.log(chanel2);
                    }
    
                    var usuario = '';
                    if (result.matricula && !isNaN(result.matricula)) {
                        usuario = '/usuario/' + result.matricula;
                        const chanel3 = canal + tenant + perfil + usuario;
                        comet.subscribe(chanel3, callback);
                        console.log(chanel3);
                    }
                }
            });
        };
    };

    function _urlLocal() {
        var protocolo = location.protocol + "//";
        var localUrl = protocolo + location.host;
        return localUrl;
    }

    function _urlPushLocation() {
        var cometServer = "/winthor/push/v0/push-server";
        return _urlLocal() + cometServer;
    }

    function _getUsuarioLogado() {
        var promise = new Promise(function(resolve, reject) {
            
            try {
                if (_Logado != null) {
                    resolve(_Logado);
                } else {
                    var httpRequest;
                    if (window.XMLHttpRequest) { // Mozilla, Safari, ...
                        httpRequest = new XMLHttpRequest();
                    } else if (window.ActiveXObject) { // IE 8 and older
                        httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
                    }
    
                    httpRequest.onreadystatechange = function() {
                        if (httpRequest.readyState === 4 && httpRequest.status === 200) {
                            _Logado = _parseJson(httpRequest.responseText);
                            resolve(_Logado);
                        }
                    };
    
                    var url = _urlLocal() + '/winthor/autenticacao/v1/usuariologado';
                    httpRequest.open('GET', url);
                    httpRequest.send();
                }

            } catch(error) {
                _Logado = null;
                reject(Error("Falha buscar usuario logado: " + error));
            }
          });
        return promise;
    }

    function _parseJson(text) {
        var json = null;
        if (text !== null && text !== '' && typeof text === 'string') {
            try { json = JSON.parse(text); } catch(e) {}
        }
        return json;
    }

    function _getInstance() {
        var _connected = false;
        var _cometd;

        function _init() {
            console.log("init()");

            _cometd.configure({
                url: _urlPushLocation(),
                logLevel: "debug"
            });

            _cometd.addListener('/meta/handshake', _metaHandshake);
            _cometd.addListener('/meta/connect', _metaConnect);
            _cometd.handshake();

            return _cometd;
        }
        function _connectionEstablished() {
            console.log("CometD Connection Established");
        }

        function _connectionBroken() {
            console.log("CometD Connection Broken");
        }

        function _connectionClosed() {
            console.log("CometD Connection Closed");
        }
        function _metaConnect(message) {
            if (_cometd.isDisconnected()) {
                _connected = false;
                _connectionClosed();
                return;
            }

            var wasConnected = _connected;
            _connected = message.successful === true;
            if (!wasConnected && _connected) {
                _connectionEstablished();
            } else if (wasConnected && !_connected) {
                _connectionBroken();
            }
        }

        // Function invoked when first contacting the server and
        // when the server has lost the state of this client
        function _metaHandshake(handshake) {
            if (handshake.successful === true) {
                _cometd.batch(function() {
                    _connected = true;
                    console.log("-> Handshake");
                });
            }
        }

        function _build() {
            var cometdClient = _init();
            var winthorPushLocal = new _WinthorPush(cometdClient);
            return winthorPushLocal;
        }

        // create cometD
        _cometd = new org.cometd.CometD();
        if (_cometd != null && _cometd != 'undefined') {
            return _build();
        } else {
            throw "Biblioteca do CometD nao foi encontrada";
        }   
    };

    return {
        Channel: {
            NOTIFICACAO: '/notificacao',
        },
        get: _getInstance,
    };
}());
