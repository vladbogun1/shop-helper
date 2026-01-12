const container = document.getElementById('toastContainer');

export function showToast(message, variant = 'default') {
  const toast = document.createElement('div');
  toast.className = `toast ${variant}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}
