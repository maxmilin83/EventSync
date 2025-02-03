// Firestore offline persistence
db.enablePersistence().catch((err) => {
  console.error('Error enabling persistence:', err.code);
});

auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = '../pages/login.html';
    return;
  }
  listenToEventChanges();
});

const myEventsContainer = document.getElementById('my-events-container'); // My Events section
const joinedEventsContainer = document.getElementById('joined-events-container'); // Joined Events section

function listenToEventChanges() {
  const myEventsContainer = document.getElementById('my-events-container');
  const joinedEventsContainer = document.getElementById('joined-events-container');

  db.collection('events')
    .where('host', '==', auth.currentUser.email)
    .orderBy('createdAt', 'desc')
    .onSnapshot((snapshot) => {
      myEventsContainer.innerHTML = '<h1>My Events</h1>';
      
      if (snapshot.empty) myEventsContainer.innerHTML += `<p>No events yet.</p>`;

      snapshot.forEach((doc) => renderEventCard(doc, myEventsContainer, true));
    });

  // Snapshot listener for joined events
  db.collection('events')
  .where('attendees', 'array-contains', auth.currentUser.email) 
  .orderBy('createdAt', 'desc')
  .onSnapshot((snapshot) => {
    joinedEventsContainer.innerHTML = '<h1>Joined Events</h1>'; 

    if (snapshot.empty) joinedEventsContainer.innerHTML += `<p>No events yet.</p>`;

    snapshot.forEach((doc) => {
      renderEventCard(doc, joinedEventsContainer, false); 
    });
  });
}

function renderEventCard(doc, container, isMyEvent) {
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
    <div class="event-actions" style="display: flex; justify-content: flex-start; gap: 10px; margin-top: 10px;"></div>
    ${isMyEvent ? `<button class='event-card-delete'>x</button>` : ''}
  `;

  const actionsContainer = eventCard.querySelector('.event-actions');

  if (isMyEvent) {
    const deleteButton = eventCard.querySelector('.event-card-delete');
    deleteButton.addEventListener('click', () => handleDelete(doc.id));
  }

   // Add Delete button for My Events
   if (isMyEvent) {
    const deleteButton = eventCard.querySelector('.event-card-delete');
    deleteButton.addEventListener('click', () => handleDelete(doc.id));
  } else if (!isMyEvent && event.attendees.includes(auth.currentUser.email)) {
    const leaveButton = document.createElement('button');
    leaveButton.classList.add('event-join-btn', 'leave-btn');
    leaveButton.textContent = 'Leave Event';
    leaveButton.addEventListener('click', () => handleJoinLeaveEvent(doc.id, event.attendees));
    actionsContainer.appendChild(leaveButton);
  }
  // Add View Attendees button
  const viewAttendeesButton = document.createElement('button');
  viewAttendeesButton.classList.add('view-attendees-btn', 'event-btn');
  viewAttendeesButton.textContent = 'View Attendees';
  viewAttendeesButton.addEventListener('click', () =>
    showAttendeesModal(event.attendees)
  );
  actionsContainer.appendChild(viewAttendeesButton);

  // Add Chat button 
  const chatButton = document.createElement('button');
  chatButton.className = 'chat-btn event-btn';
  chatButton.style = 'background: none; border: none; cursor: pointer; padding: 0; margin: 0; margin-left: auto;';
  chatButton.innerHTML = `<span class="material-symbols-outlined" style="font-size: 36px; color: rgb(0, 111, 246);">chat</span>`;
  chatButton.addEventListener('click', () => openChatModal(doc.id));
  actionsContainer.appendChild(chatButton);

  // Append event card to the container
  container.appendChild(eventCard);
}

// Handle event deletion
function handleDelete(eventId) {
  Swal.fire({
    title: 'Are you sure?',
    text: 'Do you want to delete this event?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel',
  }).then((result) => {
    if (result.isConfirmed) {
      db.collection('events')
        .doc(eventId)
        .delete()
        .then(() => {
          Swal.fire('Deleted!', 'The event has been deleted.', 'success');
        })
        .catch((error) => {
          console.error('Error deleting document: ', error);
          Swal.fire('Error!', 'Failed to delete the event.', 'error');
        });
    }
  });
}

// Open chat modal
function openChatModal(eventId) {
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
}

// Chat listeners
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

// Send a chat message
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

// Show attendees modal
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


function handleJoinLeaveEvent(eventId, attendees) {
  const userEmail = auth.currentUser.email;

  if (attendees.includes(userEmail)) {
    // Confirmation modal for leaving the event
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
          .doc(eventId)
          .update({
            attendees: firebase.firestore.FieldValue.arrayRemove(userEmail),
          })
          .then(() => {
            Swal.fire('Left!', 'You have left the event.', 'success');
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
      .doc(eventId)
      .update({
        attendees: firebase.firestore.FieldValue.arrayUnion(userEmail),
      })
      .then(() => {
        Swal.fire('Joined!', 'You have joined the event.', 'success');
      })
      .catch((error) => {
        console.error('Error joining event:', error);
        Swal.fire('Error!', 'Failed to join the event.', 'error');
      });
  }
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

