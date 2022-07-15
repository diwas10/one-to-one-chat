import express, {Application, NextFunction} from "express";
import {v4 as uuid} from "uuid";
import {Socket} from "socket.io";
import path from "path";
import {ChatData} from "./utils/interface";
import {ErrorRes, SuccessRes} from "./utils/response";

const app: Application = express();
const http = require("http").Server(app);

const io = require("socket.io")(http, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(express.static(path.join(__dirname, "static")))

let users: Array<{ user: string }> = [];
const messages: ChatData[] = [];

app.set("view engine", "ejs")

export const Port = 3000;
app.use(express.urlencoded({extended: true}))

app.get("/", (req, res) => {
    res.render("index.ejs", {
        text: "Text"
    })
});

app.get("/chat/users", (req, res) => {
    let filteredUser: Array<string> = [];
    if (req.query?.user) {
        users.forEach(user => {
            if (user.user !== req.query?.user) filteredUser.push(user.user)
        })
    } else res.status(200).send(ErrorRes({message: "Please Send the current User"}))

    res.status(200).send(SuccessRes({data: filteredUser, message: "Users Fetched Successfully"}))
});

app.get("/chat/getAll/:user/:withUser", (req, res) => {
    const {user, withUser} = req.params;

    if (!user || !withUser) res.status(404).send(ErrorRes({message: "User Not Found"}));

    const filteredMessages = messages.filter(message => {
        return (message.from === user && message.to === withUser) || (message.from === withUser && message.to === user)
    });

    res.status(200).send(SuccessRes({data: filteredMessages, message: "Message Fetched Successfully"}));
});

io.use((socket: Socket, next: NextFunction) => {
    const user = socket.handshake.auth?.token;

    if (!user) return next(new Error("Invalid User"));
    next();
});

io.sockets.on("connection", (socket: Socket) => {
    const user: string = socket.handshake.auth?.token;

    const index = users.findIndex(userFind => userFind.user === user)
    if (index < 0) {
        users.push({user});
        socket.broadcast.emit("user", {user});
    }

    const connectedSockets: Map<string, Socket> = io.sockets.sockets;
    console.log("************* Socket: User Connected ***************");

    socket.on("message", ({message, to}: Omit<ChatData, "id">) => {
        const msg = {message, id: uuid(), to, from: user};
        messages.push(msg);

        socket.emit("message", msg);

        const socketList = Array.from(connectedSockets.values());

        let toSocket = socketList.find((connectedOne: Socket) => connectedOne.handshake.auth?.token === to);

        if (toSocket) toSocket.emit("message", msg)
    });

    socket.on("disconnect", () => {
        console.log("Socket: User disconnected");
        users = users.filter(filterUser => filterUser.user !== user);
        socket.broadcast.emit("user", {user, remove: true});
    })

})


http.listen(Port, () => {
    console.log(`Server is Listening on port ${Port}`)
})
