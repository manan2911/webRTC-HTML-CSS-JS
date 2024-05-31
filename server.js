
const fs = require('fs');

const https = require('https');
const express = require('express');
const app = express();
const socketio = require('socket.io');
const { off } = require('process');

// we need a key and a cert tot run oon https 
// we generate them with mkcert
// $ mkcert create-ca
// $ mkcert create-cert
const key = fs.readFileSync('create-cert-key.pem');
const cert = fs.readFileSync('create-cert.pem');

app.use(express.static(__dirname));


// we change our express setuo so we can use https 
// pass the key and cert to createServer on HTTPS
const expressServer = https.createServer({key,cert},app);

const io = socketio(expressServer)

expressServer.listen(8080);

// offers will contain {}
const offers = [
    //offererUserName
    //offer
    //offerIceCandidates
    //answereUserName
    //answer
    //answereerICECandidates
]; 
const connectedSockets = [
    //userName, and map it with socketID
]
io.on('connection',(socket)=>{


    console.log("KOI TO H BC!!");

    const userName = socket.handshake.auth.userName;
    const password = socket.handshake.auth.password;
    console.log(userName)
    console.log(password)
    if(password!=='x'){
        socket.disconnect(true);
        return;
    }

    connectedSockets.push ({
        socketID : socket.id,
        userName
    })

    // a new client has joined . If there are nay offers available 
    //emit them out
    if(offers.length){
        socket.emit('availableOffers',offers);
    }


    socket.on('newOffer',newOffer=>{
        offers.push({
            offererUserName :userName,
            offer:newOffer,
            offerIceCandidates:[],
            answereUserName:null,
            answer: null,
            answereerICECandidates:[]
        })

        console.log(newOffer.sdp.slice(50));

        //send out to all connected sockets EXPEXTTHE CALLER

        socket.broadcast.emit('newOfferAwaiting',offers.slice(-1))
    })

    socket.on('newAnswer',(offerObject,ackFunction)=>{
        console.log(offerObject);
        //emit this answer (offerObject ) back to client1 
        // in order to do that , we need client11's socketid
        console.log("offerObject.offererUserName"+offerObject.offererUserName);
        connectedSockets.forEach(element => {
            console.log(element.userName);
            console.log(element.socketID);
            
        });
        const socketToAnswer = connectedSockets.find(s=>s.userName == offerObject.offererUserName)
        if(!socketToAnswer){
            console.log("appropriate socket id not found");
            return;
        }
        //we found the matching socket to emit to 
        const socketIdToAnswer = socketToAnswer.socketID;
        console.log("oooooooooooooo"+socketIdToAnswer);
        const offerToUpdate = offers.find(o=>o.offererUserName == offerObject.offererUserName)

        if(!offerToUpdate){
            console.log("NO OFFER TO UPDATE");
            return;
        }
        //send back to the answerer all teh iceCandidates we have already collected

        ackFunction(offerToUpdate.offerIceCandidates)
        offerToUpdate.answer = offerObject.answer;

        offerToUpdate.answereUserName = userName;
        console.log("afineaiponfoeak"+offerToUpdate.answereUserName);
        //.to which allows emmiting to a "room" every socket has its own room
        socket.to(socketIdToAnswer).emit('answerResponse',offerToUpdate);
    })
    
    
    socket.on('sendIceCandidateToSignalingServer',iceCandidateObj=>{
        const {didIOffer,iceUserName,iceCandidate} = iceCandidateObj;
        console.log(iceCandidate,didIOffer,iceUserName);
        if(didIOffer){
            const offerInOffers = offers.find(o=>o.offererUserName===iceUserName)
            if(offerInOffers){
                offerInOffers.offerIceCandidates.push(iceCandidate);
                //1. when the answerer answers all existing ice candidates are sent 
                //2. any candidate that come in after the offer ihas been answered , will pass through
                if(offerInOffers.answereUserName){
                    //pass it through to the other socket
                    const socketTotSendTo = connectedSockets.find(s=>s.userName == offerInOffers.answereUserName)
                    if(socketTotSendTo){
                        socket.to(socketTotSendTo.socketID).emit('recievedIceCandidateFromServer',iceCandidate); 
                    }else
                    console.log("ice candidate recived but could not find the answerer")
                }
            }
        }else{
            // this ice is coming from the answere send it to the offrer
            //pass it through to the other socket
            const offerInOffers = offers.find(o=>o.answereUserName===iceUserName)

            const socketTotSendTo = connectedSockets.find(s=>s.userName == offerInOffers.offererUserName)
            if(socketTotSendTo){
                socket.to(socketTotSendTo.socketID).emit('recievedIceCandidateFromServer',iceCandidate); 
            }else
            console.log("ice candidate recived but could not find the oferer")
        }
    })
})
