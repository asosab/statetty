"use strict";

/* ======= Header animation ======= */   
const header = document.getElementById('header');  

window.onload=function() 
{   
    headerAnimation(); 

};

window.onresize=function() 
{   
    headerAnimation(); 

}; 

window.onscroll=function() 
{ 
    headerAnimation(); 

}; 
    

function headerAnimation () {

    var scrollTop = window.scrollY;
	
	if ( scrollTop > 0 ) {	    
	    header.classList.add('navbar-fixed-top');    
	    	    
	} else {
	    header.classList.remove('navbar-fixed-top');
	}

};




let scrollLinks = document.querySelectorAll('.scrollto');
const pageNavWrapper = document.getElementById('navbar-collapse');

scrollLinks.forEach((scrollLink) => {

	scrollLink.addEventListener('click', (e) => {
		
		e.preventDefault();

		let element = document.querySelector(scrollLink.getAttribute("href"));
		
		const yOffset = 70; //page .header height
		
		//console.log(yOffset);
		
		const y = element.getBoundingClientRect().top + window.pageYOffset - yOffset;
		
		window.scrollTo({top: y, behavior: 'smooth'});
		
		
		//Collapse mobile menu after clicking
		if (pageNavWrapper.classList.contains('show')){
			pageNavWrapper.classList.remove('show');
		}

		
    });
	
});

/* ===== Gumshoe SrollSpy ===== */
/* Ref: https://github.com/cferdinandi/gumshoe  */

// Initialize Gumshoe
var spy = new Gumshoe('#nav-menu .nav-link', {
	offset: 70
});

/* ======= Scroll animation (fade-up) ======= */
const fadeEls = document.querySelectorAll('.fade-up');
if (fadeEls.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  fadeEls.forEach(el => observer.observe(el));
}

/* ======= Count-up (números) ======= */
(function () {
  var section = document.getElementById('inicio');
  if (!section) return;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      entry.target.querySelectorAll('.numero-valor[data-target]').forEach(function (el) {
        var target   = parseInt(el.dataset.target, 10);
        var prefix   = el.dataset.prefix  || '';
        var suffix   = el.dataset.suffix  || '';
        var duration = 1400;
        var start    = performance.now();
        var fmt      = function (n) { return prefix + n.toLocaleString('es-BO') + suffix; };
        var tick     = function (now) {
          var elapsed  = now - start;
          var progress = Math.min(elapsed / duration, 1);
          var eased    = 1 - Math.pow(1 - progress, 3);
          el.textContent = fmt(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    });
  }, { threshold: 0.3 });
  observer.observe(section);
})();
