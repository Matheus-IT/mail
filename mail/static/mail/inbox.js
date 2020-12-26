document.addEventListener('DOMContentLoaded', function() {
  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // By default, load the inbox
  load_mailbox('inbox');
});


function hideOthersAndShow(viewId) {
  // look up for and select all views
  const views = document.querySelectorAll('[id$=view]');

  views.forEach(view => {
    if (view.id === viewId)
      view.style.display = 'block';
    else
      view.style.display = 'none';
  });
}


function compose_email({sender = '', subject = '', body = ''}) {
  const composeView = document.querySelector('#compose-view');

  hideOthersAndShow(composeView.id);

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = sender;
  document.querySelector('#compose-subject').value = subject;
  document.querySelector('#compose-body').value = body;

  const composeForm = document.querySelector('#compose-form');

  composeForm.onsubmit = function() {
    event.preventDefault();

    const composeRecipients = document.querySelector('#compose-recipients');
    const composeSubject = document.querySelector('#compose-subject');
    const composeBody = document.querySelector('#compose-body');

    fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
        recipients: composeRecipients.value,
        subject: composeSubject.value,
        body: composeBody.value
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log(data);
      load_mailbox('sent');
    })
    .catch(err => console.log(err));
  };
}


function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}


function handleReply(emailObj) {
  if (emailObj.subject.startsWith('Re: ') || emailObj.subject.startsWith('re: '))
    emailObj.subject = `${emailObj.subject}`;
  else
    emailObj.subject = `Re: ${emailObj.subject}`;

  emailObj.body = `On ${emailObj.timestamp} ${emailObj.sender} wrote: ${emailObj.body}`;
  
  compose_email(emailObj);
}


async function handleArchiveUnarchive(emailObj) {
  try {
    await fetch(`/emails/${emailObj.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        archived: ! emailObj.archived
      })
    });

    load_mailbox('inbox');
  } catch(err) {
    console.log(err);
  }
}


function createReplyBtn(emailObj) {
  const replyBtn = document.createElement('button');

  replyBtn.setAttribute('type', 'button');
  replyBtn.setAttribute('class', 'btn btn-outline-primary reply');
  replyBtn.innerHTML = 'Reply';
  replyBtn.setAttribute('onclick', `handleReply(${JSON.stringify(emailObj)})`);

  return replyBtn;
}


function createToggleArchiveUnarchive(emailObj) {
  const toggleArchiveUnarchive = document.createElement('button');
    
  toggleArchiveUnarchive.setAttribute('type', 'button');
  toggleArchiveUnarchive.setAttribute('class', 'btn btn-outline-primary');
  toggleArchiveUnarchive.setAttribute('onclick', `handleArchiveUnarchive(${JSON.stringify(emailObj)})`);

  if (emailObj.archived)
    toggleArchiveUnarchive.innerHTML = 'Unarchive';
  else
    toggleArchiveUnarchive.innerHTML = 'Archive';
  
  return toggleArchiveUnarchive;
}


function createEmailViewItem(emailObj, mailbox) {
  const emailViewItem = document.createElement('div');
  
  emailViewItem.setAttribute('id', 'emailContainer');
  emailViewItem.innerHTML = `
    <div class="from">
      <strong>From:</strong> ${emailObj.sender}
    </div>
    
    <div class="to">
      <strong>To:</strong> ${emailObj.recipients}
    </div>
    
    <div class="subject">
      <strong>Subject:</strong> ${emailObj.subject}
    </div>
    
    <div class="timestamp">
      <strong>Timestamp:</strong> ${emailObj.timestamp}
    </div>
  `;

  if (mailbox !== 'sent') {
    const replyBtn = createReplyBtn(emailObj);
    emailViewItem.append(replyBtn);

    const toggleArchiveUnarchive = createToggleArchiveUnarchive(emailObj);
    emailViewItem.append(toggleArchiveUnarchive);
  }
  
  emailViewItem.innerHTML += `
    <p class="body">
      ${emailObj.body}
    </p>
  `;

  return emailViewItem;
}


function handleOnClickEmail(emailId, mailbox) {
  const emailView = document.querySelector('#email-view');
  
  // Hide the other views
  hideOthersAndShow(emailView.id);

  fetch(`/emails/${emailId}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: true
    })
  })
  .catch(err => console.log(err));

  fetch(`/emails/${emailId}`)
  .then(response => response.json())
  .then(email => {
    const emailViewItem = createEmailViewItem(email, mailbox);

    emailView.innerHTML = '';
    emailView.append(emailViewItem);
  })
  .catch(err => console.log(err));
}


function createEmailItem(emailObj, mailbox) {
  const emailItem = document.createElement('button');

  emailItem.setAttribute('type', 'button');
  emailItem.setAttribute('class', 'email');

  if (emailObj.read)
    emailItem.classList.add('wasRead');

  emailItem.innerHTML = `
    <div class="senderAndSubject">
      <strong>${emailObj.sender}</strong>
      <div class="subject">${emailObj.subject}</div>
    </div>

    <div class="timestamp">${emailObj.timestamp}</div>
  `;
  emailItem.onclick = () => handleOnClickEmail(emailObj.id, mailbox);

  return emailItem;
}


function load_mailbox(mailbox) {
  const emailsView = document.querySelector('#emails-view');
  
  hideOthersAndShow(emailsView.id);

  // Show the mailbox name
  emailsView.innerHTML = `<h3>${capitalize(mailbox)}</h3>`;

  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(data => {
    data.map(email => {
      const emailItem = createEmailItem(email, mailbox);

      if (mailbox === 'sent')
        emailItem.classList.remove('wasRead');

      emailsView.append(emailItem);
    });
  })
  .catch(err => console.log(err));
}
