import { io } from 'socket.io-client';

export const setupSocketConnection = ({url, postId, updateCommentCount} : {url: string, postId: string, updateCommentCount: any}) => {
  
    const socket = io(url);
    socket.emit('joinCommentCountRoom', postId);

    socket.on('connect', () => {
        console.log('Connected to the server!');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from the server!');
    });
    
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
    });

    socket.on('updateCommentCount', (newCommentCount, postId) => {
        console.log("Aa gya ji: " + newCommentCount + " " + postId);
        updateCommentCount(newCommentCount, postId);
    });

    return socket;
  
};

