// Firestore offline persistence
db.enablePersistence()
  .catch((err) => {
    console.error("Error enabling persistence:", err.code);
  });

auth.onAuthStateChanged(async (user) => {
  if (!user) return (window.location.href = '../pages/login.html');
});

const eventContainer = document.getElementById('event-container');

function listenToEventChanges() {
  db.collection('events')
    .orderBy('createdAt', 'desc')
    .onSnapshot((snapshot) => {
      eventContainer.innerHTML = '<h1>Events</h1>';

      if (snapshot.empty) eventContainer.innerHTML += `<p>No events yet. Check back later!</p>`;

      snapshot.forEach((doc) => {
        const event = doc.data();
        const eventCard = document.createElement('div');
        eventCard.classList.add('event-card');
        eventCard.setAttribute('data-event-id', doc.id); 
        eventCard.innerHTML = `
          <h2>${event.title}</h2>
          <p>Date: ${event.date}</p>
          <p>Location: ${event.location}</p>
          <p>Description: ${event.description}</p>
          <p>Host: ${event.host}</p>
          <div class="event-actions"></div>
        `;

        const actionsContainer = eventCard.querySelector('.event-actions');

        // Skip the Join/Leave button for the host
        if (event.host !== auth.currentUser.email) {
          const joinButton = document.createElement('button');
          joinButton.classList.add('event-join-btn');
          if (event.attendees.includes(auth.currentUser.email)) {
            joinButton.textContent = 'Leave Event';
            joinButton.classList.add('leave-btn');
          } else {
            joinButton.textContent = 'Join Event';
          }

          joinButton.addEventListener('click', () =>
            handleJoinLeaveEvent(doc.id, event.attendees)
          );
          actionsContainer.appendChild(joinButton);
        }
        // Add View Attendees button
        const viewAttendeesButton = document.createElement('button');
        viewAttendeesButton.classList.add('view-attendees-btn');
        viewAttendeesButton.textContent = 'View Attendees';
        viewAttendeesButton.addEventListener('click', () =>
          showAttendeesModal(event.attendees)
        );
        actionsContainer.appendChild(viewAttendeesButton);
        // Chat button
        const chatButton = document.createElement('button');
        chatButton.className = 'chat-btn';
        chatButton.style = 'background: none; border: none; cursor: pointer; padding: 0; margin: 0; margin-left: auto;';
        chatButton.innerHTML = `<span class="material-symbols-outlined" style="font-size: 36px; color: rgb(0, 111, 246);">chat</span>`;

        chatButton.setAttribute('data-event-id', doc.id); // Set event ID
        actionsContainer.appendChild(chatButton);

        eventContainer.appendChild(eventCard);
      });
    });
}
// Handle Join/Leave Event
function handleJoinLeaveEvent(docId, attendees) {
  const userEmail = auth.currentUser.email;

  if (attendees.includes(userEmail)) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you really want to leave this event?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33', 
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, leave it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        db.collection('events')
          .doc(docId)
          .update({
            attendees: firebase.firestore.FieldValue.arrayRemove(userEmail),
          })
          .then(() => {
            Swal.fire({
              title: 'Joined!',
              text: 'You have left the event.',
              icon: 'success',
              confirmButtonColor: '#007BFF',
            });
          })
          .catch((error) => {
            console.error('Error leaving event:', error);
            Swal.fire('Error!', 'Failed to leave the event.', 'error');
          });
      }
    });
  } else {
    // Join event without confirmation
    db.collection('events')
      .doc(docId)
      .update({
        attendees: firebase.firestore.FieldValue.arrayUnion(userEmail),
      })
      .then(() => {
        Swal.fire({
          title: 'Joined!',
          text: 'You have joined the event.',
          icon: 'success',
          confirmButtonColor: '#007BFF',
        });
      })
      .catch((error) => {
        console.error('Error joining event:', error);
        Swal.fire('Error!', 'Failed to join the event.', 'error');
      });
  }
}
// Show Attendees Modal
function showAttendeesModal(attendees) {
  const attendeesList = attendees
    .map((attendee) => `<li>${attendee}</li>`)
    .join('');
  Swal.fire({
    title: 'Attendees',
    html: `<ul>${attendeesList || '<li>No attendees yet</li>'}</ul>`,
    confirmButtonText: 'Close',
    confirmButtonColor: '#007BFF',
  });
}

eventContainer.addEventListener('click', async (event) => {
  // Check if the clicked element or its parent is a chat-btn
  const chatButton = event.target.closest('.chat-btn');
  if (!chatButton) return;

  const eventId = chatButton.closest('.event-card')?.getAttribute('data-event-id');
  if (!eventId) {
    console.error('No event ID found!');
    return;
  }

  Swal.fire({
    title: 'Event Chats',
    html: `
      <div id="chatMessages" style="height: 350px; overflow-y: auto; margin-bottom: 15px; border: 1px solid #ccc; padding: 10px; text-align: left;"></div>
      <div style="display: flex;">
        <input id="chatInput" type="text" placeholder="Type a message..." class="swal2-input" style="flex: 1; margin-right: 10px;">
        <button id="sendChatButton" style="background: none; border: none; cursor: pointer;">
          <span class="material-symbols-outlined" style="font-size: 36px; color: rgb(0, 111, 246);">send</span>
        </button>
      </div>
    `,
    showConfirmButton: false,
    didOpen: () => {
      setupChatListeners(eventId);
      document.getElementById('sendChatButton').onclick = async () => {
        const message = document.getElementById('chatInput').value.trim();
        if (message) await sendChatMessage(eventId, message), (document.getElementById('chatInput').value = '');
      };
    },
  });
});


function setupChatListeners(eventId) {
  const chatMessagesDiv = document.getElementById('chatMessages');

  db.collection('events')
    .doc(eventId)
    .collection('chats')
    .orderBy('timestamp')
    .onSnapshot((snapshot) => {
      chatMessagesDiv.innerHTML = '';
      snapshot.forEach((doc) => {
        const message = doc.data();
        const messageDiv = document.createElement('div');
        messageDiv.textContent = `${message.sender}: ${message.text}`;
        chatMessagesDiv.appendChild(messageDiv);
      });

      chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    });
}
// Fetch and Display Chats
async function fetchChats(eventId) {
  const chatMessagesDiv = document.getElementById('chatMessages');
  chatMessagesDiv.innerHTML = ''; 

  const chatsSnapshot = await firebase.firestore()
    .collection('events')
    .doc(eventId)
    .collection('chats')
    .orderBy('timestamp')
    .get();

  chatsSnapshot.forEach((doc) => {
    const message = doc.data();
    const messageDiv = document.createElement('div');
    messageDiv.textContent = `${message.sender}: ${message.text}`;
    chatMessagesDiv.appendChild(messageDiv);
  });
}

async function sendChatMessage(eventId, message) {
  await db.collection('events')
    .doc(eventId)
    .collection('chats')
    .add({
      sender: auth.currentUser.email, 
      text: message,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });
}
// Add Event Button Logic
document.getElementById('add-event-btn').addEventListener('click', () => {
  Swal.fire({
    title: 'Add Event',
    html: `
      <input type="text" id="event-name" class="swal2-input" placeholder="Event Name">
      <input type="date" id="event-date" class="swal2-input">
      <input type="text" id="event-location" class="swal2-input" placeholder="Location">
      <textarea id="event-description" class="swal2-textarea" placeholder="Description"></textarea>
    `,
    showCancelButton: true,
    confirmButtonText: 'Save',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#007BFF',
    cancelButtonColor: '#d33',
    preConfirm: () => {
      const title = document.getElementById('event-name').value;
      const date = document.getElementById('event-date').value;
      const location = document.getElementById('event-location').value;
      const description = document.getElementById('event-description').value;

      if (!title || !date || !location || !description) {
        Swal.showValidationMessage('Please fill out all fields');
        return;
      }

      const selectedDate = new Date(date);
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); 

      if (selectedDate < currentDate) {
        Swal.showValidationMessage('Event date cannot be before today');
        return;
      }

      return { title, date, location, description };
    },
  }).then((result) => {
    if (result.isConfirmed) {
      const eventData = result.value;

      db.collection('events')
        .add({
          title: eventData.title,
          date: eventData.date,
          location: eventData.location,
          description: eventData.description,
          host: auth.currentUser.email,
          attendees: [], 
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        })
        .then(() => {
          Swal.fire('Success!', 'Event has been added.', 'success');
        })
        .catch((error) => {
          console.error('Error adding event:', error);
          Swal.fire('Error', 'Could not add event. Please try again.', 'error');
        });
    }
  });
});

document.addEventListener('DOMContentLoaded', listenToEventChanges);
