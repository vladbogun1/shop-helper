const modalRoot = document.getElementById('modalRoot');

export function openModal({ title, content, onClose, actions = [] }) {
  modalRoot.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="btn ghost" data-modal-close>Закрыть</button>
      </div>
      <div class="modal-body"></div>
      <div class="inline-controls" id="modalActions"></div>
    </div>
  `;

  const body = modalRoot.querySelector('.modal-body');
  if (typeof content === 'string') {
    body.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }

  const actionsRoot = modalRoot.querySelector('#modalActions');
  actions.forEach((action) => {
    const button = document.createElement('button');
    button.className = `btn ${action.variant || ''}`;
    button.textContent = action.label;
    button.addEventListener('click', action.onClick);
    actionsRoot.appendChild(button);
  });

  modalRoot.classList.remove('hidden');

  modalRoot.querySelector('[data-modal-close]').addEventListener('click', () => {
    closeModal();
    onClose?.();
  });
}

export function closeModal() {
  modalRoot.classList.add('hidden');
  modalRoot.innerHTML = '';
}
