### TODO: Présentation du module

# Installation

```
npm install mute-server
```

If you want to use the socketIOAdapter provided in this module, you will need to install **socket.io** too:

```
npm install socket.io
```

# Utilisation

**In your app.js file:**

```
var server = require('http').createServer(app),
var Coordinator = require('mute-server').Coordinator,
var SocketIOAdapter = require('mute-server').SocketIOAdapter;

var coordinator = new Coordinator();
var socketIOAdapter = new SocketIOAdapter(server, coordinator);
coordinator.setNetwork(socketIOAdapter);
```

### Network

The network architecture provided consist in an **central server** communicating with clients using WebSockets, using **socket.io**, and broadcasting the modifications made by users to the others.
If you don't want to use **socket.io**, you can easily **implement your own network architecture**, as long as you respect the **name of the events and the data structure** used to communicate between the **coordinator and the network adapter**.

# See also

* [**mute-demo**](https://github.com/MatthieuNICOLAS/mute-demo)
* [**mute-client**](https://github.com/MatthieuNICOLAS/mute-client)
* [**mute-structs**](https://github.com/MatthieuNICOLAS/mute-structs)
* [**mute-utils**](https://github.com/MatthieuNICOLAS/mute-utils)
