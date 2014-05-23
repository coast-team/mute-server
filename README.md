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

## License

**mute-server** is licensed under the GNU General Public License 3.

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
this program. If not, see <http://www.gnu.org/licenses/>.

The documentation, tutorial and source code are intended as a community
resource and you can basically use, copy and improve them however you want.
Included works are subject to their respective licenses.