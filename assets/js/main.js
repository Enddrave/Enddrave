
const topBtn = document.getElementById('scrollTopBtn');
if(topBtn){
  topBtn.addEventListener('click', ()=> window.scrollTo({top:0, behavior:'smooth'}));
}
