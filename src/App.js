import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import Form from './components/UsernameForm';
import Chat from './components/Chat'
import immer from 'immer';
import './App.css';

const initialMessageState = {
  general: [],
  random: [],
  jokes: [],
  javascript: []
};

function App() {
  // Sätts i Formen
  const [username, setUsername] = useState("");
  /**
   * Om användaren redan är uppkopplad. Aka om det ska renderas ut en
   * form eller chattens
   */
  const [connected, setConnected] = useState(false)

  /**
   * Sätter om en användare är ansluten till en (eller flera) chatts. 
   * By default är användaren ansluten till General men om användaren ansluter till fler
   * chatten kommer namnen pushas in i arrayen.
   */
  const [currentChat, setCurrentChat] = useState({ isChannel: true, chatName: "general", receiverId: ""})

  const [connectedRooms, setConnectedRooms] = useState(['general']);

  /**
   * Sätter alla aktiva användare i applikationen
   */
  const [allUsers, setAllUsers] = useState([]);

  /**
   * Sätter ett objekt som innehåller alla meddelanden i en chatt
   */
  const [messages, setMessages] = useState(initialMessageState)

  /**
   * Ett indviduellt message. Själva texten som skrivs.
   */
  const [message, setMessage] = useState("");

  const socketRef = useRef();

  const handleMessageChange = (e) => {
    setMessage(e.target.value)
  }

  useEffect(() => {
    setMessage("");
  }, [messages])

  const sendMessage =()=> {
    const payload = {
      content: message,
      to: currentChat.isChannel ? currentChat.chatName : currentChat.receiverId,
      sender: username,
      chatName: currentChat.chatName,
      isChannel: currentChat.isChannel
    };
    socketRef.current.emit('send message', payload);
    const newMessages = immer(messages, draft => {
      draft[currentChat.chatName].push({
        sender: username,
        content: message
      });
    });
    setMessages(newMessages);
  }

  /**
   * 
   * @param {messages skickade från callback från servern} incomingMessages 
   * @param {room skickat från callback från servern} room 
   */
  const roomJoinCallback = (incomingMessages, room) => {
    const newMessages = immer(messages, draft => {
      draft[room] = incomingMessages;
    });
    setMessages(newMessages);
  }

  /**
   * @param {ett rum klienten ansluter sig till} room 
   * Callbackfunktionen (som finns på serversidan) skickar tillbaka meddelandena 
   * som är kopplade till rummet i fråga och skickar med till roomJoinCallback.
   * Sätter också det nya rummet till listan på connectedRooms.
   */
  const joinRoom = (room) => {
    const newConnectedRooms = immer(connectedRooms, draft => {
      draft.push(room);
    })
    socketRef.current.emit('join room', room, (messages) => roomJoinCallback(messages, room));
    setConnectedRooms(newConnectedRooms);
  }

  /**
   * Hoppa mellan chatter. if = om man går in/skapar en ny chatt så finns
   * det inga meddelanden kopplade till chatName. Då skapas en ny tom array kopplad till
   * den nya chatten där meddelandena
   * kommer pushas in
   * @param {namn på nuvarande eller nya chatten} currentChat 
   */
  const toggleChat = (currentChat) => {
    if(!messages[currentChat.chatName]){
      const newMessages = immer(messages, draft => {
        draft[currentChat.chatName] = [];
      });
      setMessages(newMessages);
    }
    setCurrentChat(currentChat);
  }

  /**
   * Om username inte fanns och form-komponenten därför renderats ut
   * sätts username här från formen
   * @param {*} e 
   */
  const handleChange = (e) => {
    setUsername(e.target.value);
  };

  const connect = () => {
    setConnected(true);
    socketRef.current = io.connect("/");
    socketRef.current.emit("join server", username);
    socketRef.current.emit("join room", "general", (messages) => roomJoinCallback(messages, "general"));
    socketRef.current.on("new user", allUsers => {
      setAllUsers(allUsers);
    });
    socketRef.current.on('new messages', ({ content, sender, chatName }) => {
      setMessages(messages => {
        const newMessages = immer(messages, draft => {
          if(draft[chatName]) {
            draft[chatName].push({ content, sender });
          } else {
            draft[chatName] = [{ content, sender }];
          }
        });
        return newMessages;
      });
    });
  }

  let body;
  if(connected) {
    body = (
      <Chat 
      message={message}
      handleMessageChange={handleMessageChange} //
      sendMessage={sendMessage}
      youId={socketRef.current ? socketRef.current.id : ""}
      allUsers={allUsers}
      joinRoom={joinRoom}
      connectedRooms={connectedRooms}
      currentChat={currentChat}
      toggleChat={toggleChat}
      messages={messages[currentChat.chatName]}
      />
    )
  } else {
    body = (
      <Form username={username} onChange={handleChange} connect={connect} />
    )
  }


  return (
    <div className="App">
     {body}
    </div>
  );
}

export default App;
