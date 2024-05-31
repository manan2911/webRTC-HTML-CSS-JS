
//om commection get all the available offers and call createOfferEls (this shows ki agar pehle se caller ne call kia va ho or jo answerer ne baadme browser khola h to usko dikh jai)
socket.on('availableOffers',offers=>{
    console.log(offers);
    createOfferEls(offers);
})

//someone just made a new offer(dono site khol rakhi h or ek jane ne call lagaya he) and we are recieving all available orffer and call createOfferEls

socket.on('newOfferAwaiting',offers=>{
    createOfferEls(offers);
})


socket.on('answerResponse',offerObj=>{
    console.log(offerObj);
    addAnswer(offerObj);
})
socket.on('recievedIceCandidateFromServer',iceCandidate=>{
    addNewIceCandiadte(iceCandidate);
    console.log(iceCandidate);
})

function createOfferEls(offers){
 // make answer green button for this new offer
    console.log(offers);
    const answerEl = document.querySelector('#answer');
    offers.forEach(o => {
        console.log(o);
        const newOfferEl = document.createElement('div');
        newOfferEl.innerHTML=`<button class="btn btn-success col-1"> ANSWER ${o.offererUserName}</button>`;
        newOfferEl.addEventListener('click',()=>answerOffer(o));
        answerEl.appendChild(newOfferEl)
    });
}