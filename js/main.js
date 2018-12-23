'use strict';
//localhost:8080

document.addEventListener("keydown", (e)=>{
	console.log(e);
	if(e.key == "#" || e.key =="*" || (isNaN(e.key) == false)){

		document.getElementById("brojka").innerHTML += e.key;
	}
	
	if(document.getElementById("brojka").innerHTML.length > 0){
		 document.getElementById("erase").disabled = false;
	}
	
	if(document.getElementById("brojka").innerHTML.length == 0){
		 document.getElementById("erase").disabled = true;
	}
	
	if(document.getElementById("up").disabled==true){
		 document.getElementById("erase").disabled = true;
	}
	
}, false);

let switch1 = true;

let isChannelReady = false;
let isInitiator = false;
let isStarted = false;
let localStream;
let pc;
let remoteStream;
let turnReady;

let pcConfig = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
};

// Set up audio and video regardless of what devices are present.
let sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

/////////////////////////////////////////////

//let room = 'foo';
// Could prompt for room name:
/*let room;
room = prompt('Enter room name:');*/
let socket = io.connect();
let room = null;

function pass(me){
	
	let elem = document.getElementById("brojka");
	let len1 = elem.innerHTML.length;

	if(me.value =="true"){
		window.location.hash = elem.innerHTML;
		callIt(elem.innerHTML);
		document.getElementById("chk").value = elem.innerHTML;
		//alert("chk: "+document.getElementById("chk").value);
		switch1 = false;
		document.getElementById("up").disabled = true;
		document.getElementById("up").children[0].style.color = "gray";
		
		document.getElementById("down").disabled = false;
		document.getElementById("down").children[0].style.color = "red";

	}
	
	if(me.value =="false"){
		switch1 = true;
		document.getElementById("up").disabled = false;
		document.getElementById("up").children[0].style.color = "green";
		
		document.getElementById("down").disabled = true;
		document.getElementById("down").children[0].style.color = "gray";
		
		elem.innerHTML = "";

		isChannelReady = false;
		isInitiator = false;
		isStarted = false;
		pc.close();
		pc = null;
	}	
	
	if(me.value != "<" && me.value != "true" && me.value != "false" && switch1 == true){

		elem.innerHTML += me.value;
		len1 = elem.innerHTML.length;
	}
	
	if(len1>0 && me.value == "<"){
		elem.innerHTML = elem.innerHTML.substr(0,len1-1);
		len1 = elem.innerHTML.length;
	}
		
	if(len1>0){
		document.getElementById("erase").disabled = false;
	}
	
	if(len1==0){
		document.getElementById("erase").disabled = true;
	}
	
	if(document.getElementById("up").disabled==true){
		 document.getElementById("erase").disabled = true;
	}
	
}

function callIt(numbers){
	
	//room = prompt('Enter room name:');
	room = numbers;
	window.location.hash = room;
	
	if(isInitiator == true){
		
	}
	
	if (room !== null) {
		socket.emit('create or join', room);
		console.log('Attempted to create or  join room', room);
	}
	socket.on('created', function(room) {
		  console.log('Created room ' + room);
		  isInitiator = true;
		});

		socket.on('full', function(room) {
		  console.log('Room ' + room + ' is full');
		});

		socket.on('join', function (room){
		  console.log('Another peer made a request to join room ' + room);
		  console.log('This peer is the initiator of room ' + room + '!');
		  isChannelReady = true;
		});

		socket.on('joined', function(room) {
		  console.log('joined: ' + room);
		  isChannelReady = true;
		});

		socket.on('log', function(array) {
		  console.log.apply(console, array);
		});
	////////////////////////////////////////////////

	function sendMessage(message) {
	  console.log('Client sending message: ', message);
	  socket.emit('message', message);
	}

	// This client receives a message
	socket.on('message', function(message) {
	  console.log('Client received message:', message);
	  if (message === 'got user media') {
		maybeStart();
	  } else if (message.type === 'offer') {
		if (!isInitiator && !isStarted) {
		  maybeStart();
		}
		pc.setRemoteDescription(new RTCSessionDescription(message));
		doAnswer();
	  } else if (message.type === 'answer' && isStarted) {
		pc.setRemoteDescription(new RTCSessionDescription(message));
	  } else if (message.type === 'candidate' && isStarted) {
		let candidate = new RTCIceCandidate({
		  sdpMLineIndex: message.label,
		  candidate: message.candidate
		});
		pc.addIceCandidate(candidate);
	  } else if (message === 'bye' && isStarted) {
		handleRemoteHangup();
	  }
	});

	////////////////////////////////////////////////////

	let localVideo = document.querySelector('#localVideo');
	let remoteVideo = document.querySelector('#remoteVideo');

	navigator.mediaDevices.getUserMedia({
	  audio: false,
	  video: true
	})
	.then(gotStream)
	.catch(function(e) {
	  alert('getUserMedia() error: ' + e.name);
	});

	function gotStream(stream) {
	  console.log('Adding local stream.');
	  localStream = stream;
	  localVideo.srcObject = stream;
	  sendMessage('got user media');
	  if (isInitiator) {
		  
			document.getElementById("kamerica1").style.display = "block";
			document.getElementById("zvuk1").style.display = "block";
			document.getElementById("kamerica2").style.display = "none";
			document.getElementById("zvuk2").style.display = "none";
			
		maybeStart();
	  }
	}

	let constraints = {
	  video: true,
	  audio: true
	};

	console.log('Getting user media with constraints', constraints);

	if (location.hostname !== 'localhost') {
	  /*requestTurn(
		'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
	  );*/
	}

	function maybeStart() {
	  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
	  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
		console.log('>>>>>> creating peer connection');
		createPeerConnection();
		pc.addStream(localStream);
		isStarted = true;
		console.log('isInitiator', isInitiator);
		if (isInitiator) {
		  doCall();
		}
	  }
	}

	window.onbeforeunload = function() {
	  sendMessage('bye');
	};

	/////////////////////////////////////////////////////////

	function createPeerConnection() {
	  try {
		pc = new RTCPeerConnection(null);
		pc.onicecandidate = handleIceCandidate;
		pc.onaddstream = handleRemoteStreamAdded;
		pc.onremovestream = handleRemoteStreamRemoved;
		console.log('Created RTCPeerConnnection');
	  } catch (e) {
		console.log('Failed to create PeerConnection, exception: ' + e.message);
		alert('Cannot create RTCPeerConnection object.');
		return;
	  }
	}

	function handleIceCandidate(event) {
	  console.log('icecandidate event: ', event);
	  if (event.candidate) {
		sendMessage({
		  type: 'candidate',
		  label: event.candidate.sdpMLineIndex,
		  id: event.candidate.sdpMid,
		  candidate: event.candidate.candidate
		});
	  } else {
		console.log('End of candidates.');
	  }
	}

	function handleCreateOfferError(event) {
	  console.log('createOffer() error: ', event);
	}

	function doCall() {
	  console.log('Sending offer to peer');
	  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
	}

	function doAnswer() {
	  console.log('Sending answer to peer.');
	  pc.createAnswer().then(
		setLocalAndSendMessage,
		onCreateSessionDescriptionError
	  );
	}

	function setLocalAndSendMessage(sessionDescription) {
	  pc.setLocalDescription(sessionDescription);
	  console.log('setLocalAndSendMessage sending message', sessionDescription);
	  sendMessage(sessionDescription);
	}

	function onCreateSessionDescriptionError(error) {
	  trace('Failed to create session description: ' + error.toString());
	}

	function requestTurn(turnURL) {
	  let turnExists = false;
	  for (let i in pcConfig.iceServers) {
		if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
		  turnExists = true;
		  turnReady = true;
		  break;
		}
	  }
	  if (!turnExists) {
		console.log('Getting TURN server from ', turnURL);
		// No TURN server. Get one from computeengineondemand.appspot.com:
		let xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
		  if (xhr.readyState === 4 && xhr.status === 200) {
			let turnServer = JSON.parse(xhr.responseText);
			console.log('Got TURN server: ', turnServer);
			pcConfig.iceServers.push({
			  'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
			  'credential': turnServer.password
			});
			turnReady = true;
		  }
		};
		xhr.open('GET', turnURL, true);
		xhr.send();
	  }
	}

	function handleRemoteStreamAdded(event) {
	  console.log('Remote stream added.');
	  remoteStream = event.stream;
	  remoteVideo.srcObject = remoteStream;
	}

	function handleRemoteStreamRemoved(event) {
	  console.log('Remote stream removed. Event: ', event);
	}

}

function hangup() {
	console.log('Hanging up.');
	stop();
	sendMessage('bye');
}

function handleRemoteHangup() {
	console.log('Session terminated.');
	stop();
	isInitiator = false;
}

function stop() {
	isStarted = false;
	pc.close();
	pc = null;
}
