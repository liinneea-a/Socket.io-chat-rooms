const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const socket = require('socket.io');
const io = socket(server);

let users = [];

const messages = {
    general: [],
    random: [],
    jokes: [],
    javascript: []
};

/**
 * on = eventlistener. Lyssnar på eventet connection.
 * Tar in en socket = en klient/användare.
 * socket.id är genereat av socket.io och är indviduellt för varje klient
 */
io.on('connection', socket => {
    console.log('connection')
    socket.on('join server', (username) => {
        const user = {
            username,
            id: socket.id
        }
        users.push(user);
        /** varje connected client ink mig själv */
        io.emit('new user', users);
    })

    socket.on('join room', (roomName, callback) => {
        socket.join(roomName);
        callback(messages[roomName]);

        /**Gör samma sak som callbacken fast kräver mer kod
         * klientsidan behöver en eventlyssnare
         */
        //socket.emit('joined', messages[roomName]);
    })

    socket.on('send message', ({ content, to, sender, chatName, isChannel }) => {
        if(isChannel) {
            const payload = {
                content,
                chatName,
                sender,
            };
            socket.to(to).emit('new message', payload);
        } else { //om det är en indviduell användare
            const payload = {
                content,
                chatName: sender,
                sender
            };
            socket.to(to).emit('new message', payload)
        };
        // Om en chatt redan innehåller tidigare meddelanden
        if (messages[chatName]) {
            messages[chatName].push({
                sender,
                content
            });
        }
    })

    socket.on('disconnect', () => {
        users = users.filter(u => u.id !== socket.id);
        io.emit('new user', users)
    })
})


server.listen(3001, () => {
    console.log('listening on port 3001')
})