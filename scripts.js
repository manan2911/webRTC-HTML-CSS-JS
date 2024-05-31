const userName = 'Manan-'+Math.floor(Math.random()*100000)
const password = 'x';
document.querySelector('#user-name').innerHTML =userName;

let didIOffer =false;

const socket= io.connect('https://192.168.19.48:8080/',{
auth:{
    userName,password
}
}
);

const localVideoEl = document.querySelector('#local-video');
const remoteVideoEl = document.querySelector('#remote-video');

let localStream; // a var to store local video stream
let remoteStream ; // a var to store remote video stream
let peerConnection; // the peerConnection that thw two clients use to talk
let peerConfiguration = {
    iceServers:[
        {
            urls:[
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302'
            ]
        }
    ]
}


//when the client initiates a call 
const call = async e =>{

    await fetchUserMedia();
    await createPeerConnection();
    // create offer time  
    try {
        console.log("creating offer...")
        const offer = await peerConnection.createOffer();
        console.log(offer)
        peerConnection.setLocalDescription(offer)
        didIOffer=true;
        console.log(offer);
        socket.emit('newOffer',offer); // send offer to the signaling server

    } catch (error) {
        console.log(error);
    }

} 


const answerOffer = async (offerObject)=>{
    await fetchUserMedia();
    await createPeerConnection(offerObject);
    const  answer = await peerConnection.createAnswer({});
    await peerConnection.setLocalDescription(answer); // this is client2 and client 2 uses this as the local description

    console.log(offerObject);
    console.log(answer);

    // console.log(peerConnection.signalingState); // should be have-local-pranswer because client 2 has setLocalDescription with teh answer , because client 2  has setRemoteDEsc on the offer

    offerObject.answer = answer //add the answer teo the offerObject  so the server know which offer it is related to 
    //emit the answer to the signaling server, so it can emit to client1
    //expect a response from the server form teh already existinf iceCandidates
    const offerIceCandidates = await socket.emitWithAck('newAnswer',offerObject);
    offerIceCandidates.forEach(c => {
        peerConnection.addIceCandidate(c);
        console.log('=======> added the ice candidates');
        
    });
    console.log(offerIceCandidates);
}


const addAnswer=async (offerObj)=>{
    //addAnswert is called in socketListeners when an answerResponse is emmited.
    // at this point , the offer ans answer have been exchanged!
    //now CLIENT! needs to set the remotepeer description
    await peerConnection.setRemoteDescription(offerObj.answer);
    // console.log(peerConnection.signalingState)
} 
const fetchUserMedia=()=>{
    return new Promise(async(resolve,reject)=>{
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video:true,
            });
            localVideoEl.srcObject = stream;
            localStream =stream;
            resolve();
        } catch (error) {
            console.log(error);
            reject();
        }
    })
}

const createPeerConnection = (offerObj) =>{
    
    return new Promise(async (resolve,reject)=>{
        //RTCPeerConnection is the thing that creates the connectionn
        //we can pass a config obhject, and that config object can contain stun servers
        //which will fetch us the ICE candidates
        peerConnection = await new RTCPeerConnection(peerConfiguration)
        remoteStream= new MediaStream();
        remoteVideoEl.srcObject = remoteStream;



        localStream.getTracks().forEach(track => {
            //add local tracks so that ethey can be send on establoishing the connection
            peerConnection.addTrack(track,localStream);
        });


        peerConnection.addEventListener(
            "signalingstatechange",
            (ev) => {
             console.log(ev)
             console.log(peerConnection.signalingState)
            }
          );
        peerConnection.addEventListener("icecandidate",e=>{
            console.log(e)
            console.log('/..........found an ice candidate.....')
            if(e.candidate)
            {
            socket.emit('sendIceCandidateToSignalingServer',
                {
                    iceCandidate:e.candidate,
                    iceUserName:userName,
                    didIOffer,
                }
            )}

        })

        peerConnection.addEventListener('track',e=>{
            console.log("got a track form teh other peer");
            console.log(e);
            e.streams[0].getTracks().forEach(track => {
                remoteStream.addTrack(track,remoteStream);
                console.log("YEAH CONNECTED OR CIDEO CHAL RHA H ");
                
            });

        })
        if(offerObj){
            // this wont be true when call from call();
            //will be true when called from answerOffer();
            // console.log(peerConnection.signalingState); // should be stable because no setDEsc has been run yet
            await peerConnection.setRemoteDescription(offerObj.offer);
            // console.log(peerConnection.signalingState); // should be have--remote-offer , because client 2  has setRemoteDEsc on the offer

        }
        resolve();
    })
   }


const hangUp= async e =>{
    localVideoEl.srcObject = null;
} 

const addNewIceCandiadte =(iceCandidate)=>{
console.log(iceCandidate);
console.log("BOOOOOOOO")
}


document.querySelector('#hangup').addEventListener('click',hangUp)
document.querySelector('#call').addEventListener('click',call)