import { t } from './i18n.js';

const selector = document.querySelector('#demo-question');
const fields = ['recognition', 'interpretation', 'source', 'review', 'outcome'];
function renderDemo() {
  const example = selector.value;
  document.querySelector('#demo-question-text').textContent = t(`demo.question.${example}`);
  for (const field of fields) {
    document.querySelector(`#demo-${field}`).textContent = t(`demo.${example}.${field}`);
  }
}
selector.addEventListener('change', renderDemo);
window.addEventListener('forma-language', renderDemo);
renderDemo();
