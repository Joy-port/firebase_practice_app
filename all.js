import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.8/firebase-app.js'
import { collection, getFirestore, getDoc, getDocs, setDoc, updateDoc, doc, arrayUnion,arrayRemove, onSnapshot, deleteField, deleteDoc, query, where } from 'https://www.gstatic.com/firebasejs/9.6.8/firebase-firestore.js'

const UID ='JoyKfxiF8bApyKRSYUjIL9M'
// const UID ='EricOV7wet8lypxJ3lTTk1KL'
// const UID ='Riley3wXKviqhvKfAMQLEoPgV'
// const UID ='Rogerv7E3Q8ZFvwqr3stLZ8pg'

let db = '';

(async function () {
    const searchForm = document.querySelector('#searchFriend')
    searchForm.addEventListener('submit', findFriend)

    const searchList = document.querySelector('#search-list')
    const invitationList = document.querySelector('#invitation-list')
    const sentList = document.querySelector('#sent-list')
    searchList.addEventListener('click', inviteFriend)
    invitationList.addEventListener('click', inviteFriend)

    const button = document.querySelector('button')
    const form = document.querySelector('#articleForm')
    button.addEventListener('click', getDatabase)
    form.addEventListener('submit', getDatabase)
    const home = document.querySelector('#home-tab')
    home.addEventListener('click', renderLibrary)
    const table = document.querySelector('table')
    table.addEventListener('click' , deleteData)
    const filterTags = document.querySelector('#filterTags')
    filterTags.addEventListener('change', renderFilterArticle)
    const filterForm = document.querySelector('#filterForm')
    filterForm.addEventListener('submit', renderFilterArticle)
    
    const firebaseConfig = {
        apiKey: "AIzaSyB8gtRqC3MhmnnWmZQKGEX4J4oIXBdUtdo",
        authDomain: "fir-webios-group7.firebaseapp.com",
        projectId: "fir-webios-group7",
        storageBucket: "fir-webios-group7.appspot.com",
        messagingSenderId: "190418487255",
        appId: "1:190418487255:web:26bfff2f2cf7fac353ed92"
    };
    
    const app = initializeApp(firebaseConfig);
    db = await getFirestore(app)
    await renderLibrary()

    onSnapshot(collection(db, "library"), (snapshot) => {
        if (!snapshot.metadata.hasPendingWrites) {
            renderLibrary()
            showDataInConsole()
        }
    });
    const userFriendList = await doc(db,'FriendList', UID)
    onSnapshot(userFriendList, { includeMetadataChanges: true },  (res) => {
        if (!res.data()) return 
        if (res.data().friends.length === 0) {
            document.querySelector('#friend-list').innerHTML = ''
            console.log('joy has no friend', res.data().friends)
            return
        }
        console.log('joys friends', res.data().friends)
        const friendsList = res.data().friends
        renderFriendsListData(friendsList)
    });
    const userPendingList = await query(collection(db, 'PendingList'), where('receiver_id', '==', UID))
    let str = ''
    onSnapshot(userPendingList,(res) => {
        res.docChanges().forEach(async (pending)=> {
            if (pending.type === 'added') {
                const friendID = pending.doc.data().sender_id
                const pendingID = pending.doc.data().document_id
                const friend  = await getProfileData(friendID)
                console.log('a friend invited you', friend)
                let content = `
                <li class="px-4 py-3 border-slate-400 border border-slate-400 rounded-md mb-3" id="${pendingID}">
                    <p class="text-center font-bold mb-3">${friend.name}</p>
                    <p class="mb-3">${friend.email}</p>
                    <button type="button" id="${friend.id}" class="w-full px-2 py-1 rounded-md bg-slate-400 border border-white text-white hover:text-slate-500 active:text-slate-500 hover:bg-white hover:border-slate-400 cursor-pointer" data-pending="${pendingID}">accepted</button>
                </li>
                `
                invitationList.insertAdjacentHTML('beforeend', content)
            } else if (pending.type === 'removed') {
                const pendingID = pending.doc.data().document_id
                document.querySelector(`#${pendingID}`).remove()
            }
        })
    })
    const userSendingList = await query(collection(db, 'PendingList'), where('sender_id', '==', UID))
    onSnapshot(userSendingList,(res) => {
        res.docChanges().forEach(async (pending)=> {
            if (pending.type === 'added') {
                const friendID = pending.doc.data().receiver_id
                const pendingID = pending.doc.data().document_id
                const friend  = await getProfileData(friendID)
                console.log(friend)
                let content = `
                <li class="px-4 py-3 border-slate-400 border border-slate-400 rounded-md mb-3" data-id="${pendingID}">
                    <p class="text-center font-bold mb-3">${friend.name}</p>
                    <p class="mb-3">${friend.email}</p>
                    <button type="button" id="${friend.id}" class="w-full px-2 py-1 rounded-md bg-white border border-slate-400 text-slate-500 opacity-50 pointer-events-none" data-pending="${pendingID}">invited</button>
                </li>
                `
                sentList.insertAdjacentHTML('beforeend', content)
            } else if (pending.type === 'removed') {
                const pendingID = pending.doc.data().document_id
                document.querySelector(`[data-id="${pendingID}"]`).remove()
            }
        })
    })

})()

async function findFriend(e) {
    e.preventDefault()
    const searchForm = document.querySelector('#searchFriend')
    if(!e.target.children[0].value.trim()) return
    const searchEmail = e.target.children[0].value.trim()
    const collectionName = 'Authors'
    const authorData = collection(db, collectionName)
    const findEmail = await query(authorData, where('email', '>=', searchEmail), where('email','<=', searchEmail +'~'))

    let hasSentInvitation = false
    const pendingDoc = collection(db, 'PendingList')
    const findPending  = await query(pendingDoc, where('sender_id', '==', UID))
    const pending = await getDocs(findPending)
    pending.forEach((doc) => {
        if(doc.exists()) {
            hasSentInvitation = true
        }
    })
    const querySnapshot = await getDocs(findEmail)
    querySnapshot.forEach(async(doc) => {
        if(doc.exists()) {
            const friend = {...doc.data()}
            console.log(friend)
            const isFriend =  await checkIsFriend(friend.id)
            await renderSearchData(isFriend, hasSentInvitation, friend.id)
            searchForm.reset()
        } else {
            alert('找不到好朋友嗎？快邀請他加入吧～')
            searchForm.reset()
        }
    });

}

async function getProfileData (friendID) {
    const collectionName ='Authors'
    const snapshot = await doc(db, collectionName, friendID)
    const getData = await getDoc(snapshot)
    const profile = { ...getData.data()}

    return profile
}

async function checkIsFriend(friendID) {
    const collectionName = 'FriendList'
    const friend = await doc(db, collectionName, UID)
    const getData = await getDoc(friend)
    const friendList = await getData.data().friends

    const isFriend = friendList.find((friend) => friend === friendID)

    return isFriend
}

async function renderSearchData(isFriend = false, hasSentInvitation,friendID) {
    const friendData = await getProfileData (friendID)
    const list = document.querySelector('#search-list')
    let content= `
        <li class="px-4 py-3 border-slate-400 border border-slate-400 rounded-md mb-3">
            <p class="text-center font-bold mb-3">${friendData.name}</p>
            <p class="mb-3">${friendData.email}</p>
            <p class="mb-3">${isFriend ? '你們已經是朋友拉～' : hasSentInvitation ? '已發送邀請函' :'你們還不是朋友喔～'}</p>
            <button type="button" id="${friendData.id}" class="w-full px-2 py-1 rounded-md  ${!isFriend && !hasSentInvitation ?'bg-slate-400 border border-white text-white hover:text-slate-500 active:text-slate-500 hover:bg-white hover:border-slate-400 cursor-pointer' : 'text-slate-500 border bg-white border-slate-400 pointer-events-none opacity-50'}">${isFriend ? 'befriended': hasSentInvitation ? 'invited': 'invite'}</button>
        </li>
        `
    list.innerHTML = ''
    list.insertAdjacentHTML('afterbegin', content)
}

async function userBefriended(userID, addID) {
    const collectionName = 'FriendList'
    const collects =  await doc(db, collectionName, userID)
    await updateDoc(collects, {friends: arrayUnion(addID)})
}

async function deletePendingDoc (pendingID) {
    const collectionName = 'PendingList'
    await deleteDoc(doc(db, collectionName, pendingID))
}

async function inviteFriend (e) {
    e.preventDefault()
    if(!e.target.closest('button')) return
    const receiver = e.target.id

    if(e.target.closest('button').textContent === 'invite') {
        const collectionName = 'PendingList'
        const addNewPending = await doc(collection(db, collectionName))
        await setDoc(doc(db, collectionName, addNewPending.id), {
            'sender_id': UID,
            'receiver_id': receiver,
            'document_id': addNewPending.id
        })
        const button = e.target.closest('button')
        button.className = 'w-full px-2 py-1 rounded-md text-slate-500 border bg-white border-slate-400 pointer-events-none opacity-50';
    } else if (e.target.closest('button').textContent === 'accepted'){
        const button  =  e.target.closest('button')
        const pendingID = button.dataset.pending
        const friendID = button.id

        await userBefriended(UID, friendID)
        await userBefriended(friendID, UID)
        await deletePendingDoc(pendingID)
        button.className = 'w-full px-2 py-1 rounded-md text-slate-500 border bg-white border-slate-400 pointer-events-none opacity-50';

    }
}


// async function checkIsPending (userID, status) {
//     const collectionName = 'Pending'
//     const pendingDoc = collection(db, collectionName)
//     const findPending  = await query(pendingDoc, where(status, '==', userID))
//     const pending = await getDocs(findPending)
//     return pending
// }

// async function renderInvitations (e) {
//     const button = e.target.closest('button')
//     const buttonGroups = document.querySelectorAll('[data-button]')
//     const list = document.querySelector('#invitation-list')
//     buttonGroups.forEach((item) => item.className ='px-2 py-1 rounded-md bg-slate-400 border border-white text-white hover:text-slate-500 active:text-slate-500 hover:bg-white hover:border-slate-400 active:bg-white active:border-slate-400')
//     button.className = 'px-2 py-1 rounded-md border text-slate-500 bg-white border-slate-400'
//     if (button.id === 'invitation') {
//         const collectionName = 'PendingList'
//         const pendingData = collection(db, collectionName)
//         const findInvitations = await query(pendingData, where('receiver_id', '==', UID))
//         const querySnapshot = await getDocs(findInvitations)
//         let invitations = []
//         querySnapshot.forEach((doc) => {
//             invitations.push(doc.data())
//         })

//        if (!invitations.length) {
//         let content = `
//         <li class="px-4 py-3 bg-slate-400 text-white rounded-md mb-3">
//             你還沒有加好友喔～ 快去邀請朋友吧！
//         </li>
//         `
//         list.innerHTML = ''
//         list.insertAdjacentHTML('beforeend', content)
//         return
//        }

//         const senderID = invitations.map((sender)=> sender.sender_id)
//         const pendingDoc = invitations.map((pending)=> pending.document_id)
//         let senderProfile = []
//         for (let i = 0; i < senderID.length; i++) {
//            const data  = await getProfileData(senderID[i])
//            data.pendingID = pendingDoc[i]
//             senderProfile.push(data)
//         }
//         let str =''
//         senderProfile.forEach((friend)=> {
//             let content = `
//             <li class="px-4 py-3 border-slate-400 border border-slate-400 rounded-md mb-3">
//                 <p class="text-center font-bold mb-3">${friend.name}</p>
//                 <p class="mb-3">${friend.email}</p>
//                 <button type="button" id="${friend.id}" class="w-full px-2 py-1 rounded-md bg-slate-400 border border-white text-white hover:text-slate-500 active:text-slate-500 hover:bg-white hover:border-slate-400 cursor-pointer" data-pending="${friend.pendingID}">accepted</button>
//             </li>
//             `
//             str += content
//         })
//         list.innerHTML = ''
//         list.insertAdjacentHTML('beforeend', str)
//     }
//     // } else if (button.id === 'friends') {
//     //     const collectionName = 'FriendList'
//     //     const userDoc = await doc(db, collectionName, UID)
//     //     const getData = await getDoc(userDoc)
//     //     const friends = [...getData.data().friends]
//     //     let str = ''
//     //     return new Promise ((resolve) => {
//     //         friends.map(async(item) => {
//     //             return getProfileData(item)
//     //             .then((res)=> {
//     //                 const item = {...res}
//     //                     let content = `
//     //                         <li class="px-4 py-3 border-slate-400 border border-slate-400 rounded-md mb-3">
//     //                             <p class="text-center font-bold mb-3">${item.name}</p>
//     //                             <p class="mb-3">${item.email}</p>
//     //                             <a href="mailto:${item.email}"  type="button" id="${item.id}" class="w-full px-2 py-1 rounded-md bg-slate-400 border border-white text-white block text-center">send Email</a>
//     //                         </li>
//     //                         `
//     //                     str += content
//     //             })
//     //             .then(() => {
//     //                 list.innerHTML = ''
//     //                 list.insertAdjacentHTML('beforeend', str)
//     //             })
//     //             })
//     //         })
//     // }

// }

async function renderFriendsListData(friends) {
    const list = document.querySelector('#friend-list')
    let str = ''
    return new Promise ((resolve) => {
        friends.map(async(item) => {
            return getProfileData(item)
            .then((res)=> {
                const item = {...res}
                    let content = `
                        <li class="px-4 py-3 border-slate-400 border border-slate-400 rounded-md mb-3">
                            <p class="text-center font-bold mb-3">${item.name}</p>
                            <p class="mb-3">${item.email}</p>
                            <a href="mailto:${item.email}"  type="button" id="${item.id}" class="w-full px-2 py-1 rounded-md bg-slate-400 border border-white text-white block text-center hover:text-slate-500">send Email</a>
                        </li>
                        `
                    str += content
            })
            .then(() => {
                list.innerHTML = ''
                list.insertAdjacentHTML('beforeend', str)
            })
            })
        })
}

async function renderInvitationList(invitationDoc) {
    const list = document.querySelector('#invitation-list')

    let senderProfile = []
    for (let i = 0; i < senderID.length; i++) {
       const data  = await getProfileData(senderID[i])
       data.pendingID = pendingDoc[i]
        senderProfile.push(data)
    }
    let str =''
    senderProfile.forEach((friend)=> {
        let content = `
        <li class="px-4 py-3 border-slate-400 border border-slate-400 rounded-md mb-3">
            <p class="text-center font-bold mb-3">${friend.name}</p>
            <p class="mb-3">${friend.email}</p>
            <button type="button" id="${friend.id}" class="w-full px-2 py-1 rounded-md bg-slate-400 border border-white text-white hover:text-slate-500 active:text-slate-500 hover:bg-white hover:border-slate-400 cursor-pointer" data-pending="${friend.pendingID}">accepted</button>
        </li>
        `
        str += content
    })
    list.innerHTML = ''
    list.insertAdjacentHTML('beforeend', str)
}

//article



async function getBooks() {
    const library = collection(db, 'library');
    const books = await getDocs(library);
    const bookList = books.docs.map(doc => doc.data());
    return bookList
}

async function showDataInConsole() {
    const getData = await getBooks(db)
}

async function getDatabase(e) {
    const title = document.querySelector('#title').value
    const content = document.querySelector('#content').value
    const tag = document.querySelector('#tag').value
    // const tag = Array.from(tagList.selectedOptions).map(item => item.value)
    e.preventDefault()
    if (!title || !content || !tag ) {
        alert('請輸入欄位')
        return
    }
    const bookContent = {
        title,
        content,
        tag,
        author_id: 'Joy',
        created_time: serverTimestamp()
    }

    try {
        const addNewBook = await doc(collection(db, 'library'))
        await setDoc(doc(db, "library", addNewBook.id), {
            ...bookContent,
            id: addNewBook.id,
        });
        // const addNewBook = await addDoc(collection(db, 'library'), {})
        document.querySelector('#title').value = ''
        document.querySelector('#content').value = ''
    } catch (err) {
        console.error("Error adding document: ", err);
    }
}


async function renderLibrary() {
    if (document.querySelector('#library-data')) {
        const table = document.querySelector('#library-data')
        const lists = await getBooks()
        let str =''
        if (!lists) return
        lists.forEach((item) => {
            const content = `
            <tr id="${item.id}">
                <th scope="row"><span class="font-light bg-slate-400 text-white rounded-md ${item.tag? 'p-1': 'p-0' }">${item.tag? item.tag: ''}</span> </th>
                <td>${item.title}</td>
                <td class="text-ellipsis overflow-x-auto max-w-10">${item.author_id}</td>
                <td>${item.created_time ? regTime(item.created_time): ''}</td>
                <td><span id="${item.id}" class="cursor-pointer font-light bg-rose-300 text-white rounded-md p-1">delete</span></td>
            </tr>
            `
            str += content
        })
        table.innerHTML = ''
        table.insertAdjacentHTML('afterbegin', str)
    }
}

function regTime(time) {
    return time.toDate().toString().split(' ').slice(1, 4).join(' ')
}


async function deleteData (e) {
    await deleteDoc(doc(db, "library", e.target.id));
    await renderLibrary()
}

async function renderFilterArticle (e) {
    e.preventDefault()
    if (e.target.closest('form')) {
        if (!e.target.children[0].value.trim()) return 
        const searchWord = e.target.children[0].value.trim()

    }else if (e.target.closest('select')) {
        const selectedTag = e.target.selectedOptions[0].value
        const table = document.querySelector('#library-data')
        const collectionName = 'library'
        const libraryData = collection(db, collectionName)
        const findArticle = await query(libraryData, where('tag', '==', selectedTag))
        const articles = await getDocs(findArticle)
        let str =''
        articles.forEach(async(doc) => {
            if(doc.exists()) {
                const articleContent = doc.data()
                const content = `
                <tr id="${articleContent.id}">
                    <th scope="row"><span class="font-light bg-slate-400 text-white rounded-md ${articleContent.tag? 'p-1': 'p-0' }">${articleContent.tag? articleContent.tag: ''}</span> </th>
                    <td>${articleContent.title}</td>
                    <td class="text-ellipsis overflow-x-auto max-w-10">${articleContent.author_id}</td>
                    <td>${articleContent.created_time ? regTime(articleContent.created_time): ''}</td>
                    <td><span id="${articleContent.id}" class="cursor-pointer font-light bg-rose-300 text-white rounded-md p-1">delete</span></td>
                </tr>
                `
                str += content
            } else {
                alert('找不到文章嗎？快去新增一篇吧～')
            }
        });
        table.innerHTML = ''
        table.insertAdjacentHTML('beforeend', str)
    }
}

