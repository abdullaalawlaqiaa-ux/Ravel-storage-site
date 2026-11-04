// Ravel Storage – site interactions
const WHATSAPP_NUMBER = '966500000000'; // غيّر هذا الرقم إلى رقم واتساب الخاص بك

document.getElementById('year').textContent = new Date().getFullYear();

// Mobile menu
const toggle = document.querySelector('.menu-toggle');
const links = document.querySelector('.nav-links');
toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});
links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  links.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}));

// Choosing a plan pre-selects it in the form
const planSelect = document.getElementById('planSelect');
document.querySelectorAll('[data-plan]').forEach(btn =>
  btn.addEventListener('click', () => { planSelect.value = btn.dataset.plan; })
);

// Booking form -> WhatsApp message
document.getElementById('bookingForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const msg = [
    'مرحباً رافيل للتخزين، أرغب في حجز وحدة تخزين:',
    `الاسم: ${f.get('name')}`,
    `الجوال: ${f.get('phone')}`,
    `حجم الوحدة: ${f.get('plan')}`,
    f.get('notes') ? `ملاحظات: ${f.get('notes')}` : ''
  ].filter(Boolean).join('\n');
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
});

// Scroll reveal
const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); } });
}, { threshold: .12 }) : null;
document.querySelectorAll('.card, .plan, .steps li, .feature, details').forEach(el => {
  if (io) { el.classList.add('reveal'); io.observe(el); }
});
