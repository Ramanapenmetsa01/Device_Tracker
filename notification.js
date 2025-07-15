function showNotification(message, isSuccess = true, duration = 4000) {
  // Remove any existing notification
  const existingNotification = document.querySelector('.notification-bar');
  if (existingNotification) existingNotification.remove();

  // Create notification container
  const notification = document.createElement('div');
  notification.className = 'notification-bar';

  // Create message element
  const messageEl = document.createElement('span');
  messageEl.className = 'notification-message';
  messageEl.textContent = message;

  // Create progress bar
  const progressBar = document.createElement('div');
  progressBar.className = 'notification-progress';

  // Set colors for success/error
  if (isSuccess) {
    notification.style.backgroundColor = '#27ae60';
    notification.style.color = '#fff';
    progressBar.style.backgroundColor = '#a8e063';
  } else {
    notification.style.backgroundColor = '#e74c3c';
    notification.style.color = '#fff';
    progressBar.style.backgroundColor = '#ffb3b3';
  }

  // Style the notification with improved visibility
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '16px 24px 10px 20px',
    borderRadius: '8px',
    zIndex: '9999', // Increased z-index to appear above modal
    minWidth: '300px',
    maxWidth: '400px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)', // Enhanced shadow
    border: '1px solid rgba(255,255,255,0.2)', // More visible border
    fontSize: '16px', // Slightly larger font
    fontWeight: '600', // Bolder text
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0',
    opacity: '1',
    transform: 'translateX(120%)',
    transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
  });

  // Style the message
  Object.assign(messageEl.style, {
    marginBottom: '8px',
    fontSize: '16px', // Slightly larger font
    fontWeight: '600', // Bolder text
    lineHeight: '1.4'
  });

  // Style the progress bar
  Object.assign(progressBar.style, {
    width: '100%',
    height: '4px',
    borderRadius: '0 0 6px 6px',
    transform: 'scaleX(0)',
    transformOrigin: 'left',
    transition: `transform ${duration}ms linear`
  });

  // Add elements to notification
  notification.appendChild(messageEl);
  notification.appendChild(progressBar);

  // Add to DOM
  document.body.appendChild(notification);

  // Trigger animations
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
    progressBar.style.transform = 'scaleX(1)';
  }, 10);

  // Remove after duration
  setTimeout(() => {
    notification.style.transform = 'translateX(120%)';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, duration);
}