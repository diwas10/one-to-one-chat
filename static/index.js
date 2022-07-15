let userList = [];
let chatData = [];
let selectedChatUser = "";
const messageContainer = document.querySelector("#message");
const inputContainer = document.querySelector("#input");
const userContainer = document.querySelector("#userContainer");
let sound = new Audio('https://audio-previews.elements.envatousercontent.com/files/156322809/preview.mp3?response-content-disposition=attachment%3B+filename%3D%22H42VWCD-notification.mp3%22');

/**
 *
 * @param elem{string}
 * @param textContent:{string}
 * @param {string | number} [value]
 * @param {string} [id]
 * @param {string} [className]
 * @returns {HTMLElement}
 */
const createDocumentNode = ({elem, textContent, value, id, className}) => {
    const node = document.createElement(elem);
    node.textContent = textContent;
    node.value = value
    node.id = id;
    node.className = className;
    return node;
}

const getAuthData = () => {
    try {
        const user = sessionStorage.getItem("user");
        if (user) return user;
        else {
            sessionStorage.setItem("user", `${Date.now()}`);
            return Date.now()
        }
    } catch (err) {
        console.log("sessionStorage Error")
    }
}

const appendMessage = (messages) => {
    if (!messages) messages = chatData;
    const currentUser = getAuthData();
    const noDataElement = document.querySelector("#listNoData");
    if (messageContainer.contains(noDataElement)) messageContainer.removeChild(noDataElement);

    if (Array.isArray(messages)) {
        if (messages.length) {
            messageContainer.innerHTML = ""
            messages.forEach(message => {
                const node = createDocumentNode({
                    elem: "li",
                    textContent: message.message,
                    className: `${message.from !== currentUser ? "mr-auto" : "ml-auto"} message`
                });
                messageContainer.append(node);
                node.scrollIntoView({behavior: "smooth"});
            });
        } else {
            const node = createDocumentNode({
                elem: "li",
                textContent: "😀 Start Conversation 😀",
                id: "listNoData",
                className: "mx-auto p-3 rounded-3 border"
            });
            messageContainer.append(node);
            node.scrollIntoView({behavior: "smooth"})
        }
    } else {
        const node = createDocumentNode({
            elem: "li", textContent: messages.message,
            className: `${messages.from !== currentUser ? "mr-auto" : "ml-auto"} message`
        });
        messageContainer.append(node);
        node.scrollIntoView({behavior: "smooth"})
    }
};

const appendUser = (users) => {

    if (!users) users = userList;

    const onNodeClick = (node, user) => {
        node.addEventListener("click", (e) => {
            selectedChatUser = user;
            document.querySelector("#active_user").textContent = user;
            userContainer.querySelector(".active")?.classList?.remove("active")
            e.target.classList.add("active");
            fetchUserChat(user);
        });
        return node;
    }
    if (Array.isArray(users)) {
        users.map((user, index) => {
            const node = createDocumentNode({
                elem: "li",
                textContent: user,
                className: `user-item ${index === 0 ? "active" : ""}`,
                id: `user_${user}`
            });
            userContainer.append(onNodeClick(node, user));
        })
    } else {

        if (users) {
            const node = createDocumentNode({
                elem: "li",
                textContent: users.user,
                className: `user-item`,
                id: `user_${users.user}`
            });
            userContainer.append(onNodeClick(node, users.user));
        }
    }

    if (!userContainer.childNodes.length) {
        return userContainer.append(createDocumentNode({
            elem: "li",
            textContent: "No active Users",
            className: "h2 d-flex align-items-center justify-content-center h-100",
        }))
    }

}

const fetchUserChat = (userValue) => {
    fetch(`/chat/getAll/${getAuthData()}/${userValue}`).then(res => res.json()).then(messages => {
        if (messages.data) {
            messageContainer.innerHTML = "";
            chatData = [...messages.data];
            appendMessage()
        }
    });
}

fetch(`/chat/users?user=${getAuthData()}`).then(res => res.json()).then(users => {
    users = users.data
    if (users?.length) {
        fetchUserChat(users[0]);
        document.querySelector("#active_user").textContent = users[0];
        selectedChatUser = users[0];
        userList = [...chatData, ...users]
        appendUser();
    }
});

const socket = io({auth: {token: getAuthData()}});

document.querySelector("#user").textContent = `USER: ${getAuthData()?.slice(5, getAuthData()?.length)}`

socket.on("connect_error", (err) => {
    console.error(err)
});

const sendMessage = () => {
    const message = inputContainer.value;
    const to = selectedChatUser;
    if (message && to) {
        socket.emit("message", {message, to});
        inputContainer.value = "";
    } else alert("Please Enter message and Receiver")
}

inputContainer.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendMessage();
    }
})


socket.on("message", (data) => {
    if (typeof data === "function") return;
    else if (typeof data === "object") {
        if (data.to === selectedChatUser || data.from === selectedChatUser) {
            chatData.push(data)
            appendMessage(data);
        }
        if (data.from !== getAuthData()) {
            sound.volume = 0.6;
            sound.play()
        }
    }
});

socket.on("user", (data) => {
    if (typeof data === "function") return;
    else if (typeof data === "object") {
        if (data.remove) {
            userContainer.querySelector(`#user_${data.user}`).remove();
            if (selectedChatUser === data.user) messageContainer.innerHTML = ""
        } else {
            if (data.user !== getAuthData()) {
                userList.push(data)
                appendUser(data);
            }
        }
    }
})