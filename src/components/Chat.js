import { useEffect, useState, useRef } from "react";
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import { makeStyles } from '@material-ui/core/styles';
import Select from '@material-ui/core/Select';
import {
  useParams
} from "react-router-dom";
import { io } from "socket.io-client";
import { Button } from "@material-ui/core";

// styling
const useStyles = makeStyles((theme) => ({
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: ' 7%'
  },
  dropdownContainer: {
    width: '150px'
  },
  videoButton: {
    marginLeft: '51px',
    marginTop: '5px'
  },
  videoContainer: {
    marginTop: '90px'
  },
  localVideo: {
    marginLeft: '100px',
    width: '300px',
    height: '200px'
  },
  remoteVideo: {
    marginLeft: '100px',
    width: '900px',
    height: '500px'
  }
}));

// initialize socket
const socket = io('http://localhost:4000');

// the functional component
const Chat = () => {
  const classes = useStyles();
  const { userName } = useParams();
  const mediaConstraints = {
    video: true
  }

  // state of the component
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const targetRef=useRef(null);
  const peerRef = useRef(null);
  const [userList, setUserList] = useState([]);
  const [selectedUserName, setSelectedUserName] = useState("");

  useEffect(() => {
    socket.emit('new-user', userName);
    socket.on('display-users', (users) => {
      setUserList(users);
    });
    socket.on('video-offer', (offer) => {
      handleVideoOfferMessage(offer)
    });
    socket.on('video-answer', (answer) => {
      handleVideoAnswer(answer)
    });
    socket.on('ice-candidate', (candidate) => {
      handleICECandidate(candidate)
    });
  }, []);

  const handleChange = (event) => {
    targetRef.current=event.target.value;
    setSelectedUserName(event.target.value);
  }

  // create peer connection for each client
  const createPeerConnection = () => {
    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302"
        }
      ]
    });
    // callbacks 
    peer.onnegotiationneeded = handleNegotiationEvent;
    peer.onicecandidate = handleICECandidateEvent;
    peer.ontrack = handleTrackEvent;
    return peer;
  }

  // function called when caller initiates call
  const handleStartCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    localVideoRef.current.srcObject = stream;
    peerRef.current = createPeerConnection();
    stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));
  }

  // function to negotiate the offer with callee
  const handleNegotiationEvent = () => {
    peerRef.current.createOffer().then((offer) => {
      return peerRef.current.setLocalDescription(offer);
    }).then(() => {
      socket.emit('video-offer', {
        name: userName,
        target: selectedUserName,
        type: 'video-offer',
        sdp: peerRef.current.localDescription
      })
    }).catch((error) => {
      console.log(error)
    });
  }

  // function to handle incomming offer and create an answer to be sent to the caller
  const handleVideoOfferMessage = (offer) => {
    const isVideoCallAccepted=window.confirm(`${offer.name} wants to connect`);
    if(isVideoCallAccepted){
        peerRef.current = createPeerConnection();
    const description = new RTCSessionDescription(offer.sdp)
    peerRef.current.setRemoteDescription(description).then(() => {
      return navigator.mediaDevices.getUserMedia(mediaConstraints);
    }).then((stream) => {
       localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));
    }).then(() => {
      return peerRef.current.createAnswer();
    }).then((answer) => { 
      return peerRef.current.setLocalDescription(answer);
    }).then(() => {
      socket.emit('video-answer', {
        name: offer.target,
        target:offer.name,
        type: "video-answer",
        sdp: peerRef.current.localDescription
      });
    }).catch((error) => console.log(error))
    }
  }

  // function to handle the incomming answer from callee to caller
  const handleVideoAnswer = (answer) => {
    const description = new RTCSessionDescription(answer.sdp);
    peerRef.current.setRemoteDescription(description).catch(error => console.log(error))
  }

  // handle new ice candidate
  const handleICECandidateEvent = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        type: "new-ice-candidate",
        target: targetRef.current,
        candidate: event.candidate
      });
    }
  }

  // function to add the incomming ice candidate to the peerConnection
  const handleICECandidate = (incommingCandidate) => {
    const candidate = new RTCIceCandidate(incommingCandidate);
    peerRef.current.addIceCandidate(candidate).catch(error => console.log(error))
  }

  // add the the remote's video to the video obj
  const handleTrackEvent = (event) => {
    remoteVideoRef.current.srcObject = event.streams[0];
  }

  // function to end call 
  const handleEndCall = () => {

  }

  return <div>
    <div className={classes.container}>
      <FormControl className={classes.dropdownContainer}>
        <InputLabel id="demo-simple-select-label">Users</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={selectedUserName}
          onChange={handleChange}
        >
          {
            userList.map((user) => {
              if (user.userName !== userName) {
                return <MenuItem value={user.userName} key={user.userName}>{user.userName}</MenuItem>
              }
            })
          }
        </Select>
      </FormControl>
      <Button variant="contained" color="primary" className={classes.videoButton} onClick={handleStartCall}>
        Start Video
      </Button>
      <Button variant="contained" color="primary" className={classes.videoButton} onClick={handleEndCall}>
        Stop Video
      </Button>
    </div>
    <div className={classes.videoContainer}>
      <video className={classes.remoteVideo} ref={remoteVideoRef} autoPlay></video>
      <video className={classes.localVideo} ref={localVideoRef} autoPlay muted></video>
    </div>
  </div>
}
export default Chat;