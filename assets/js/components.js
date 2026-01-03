/**
 * Enddrave Tech - Component Loader
 * Dynamically loads header, footer, and head components into HTML pages
 */

// Function to load HTML content from a URL
async function loadHTML(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error loading ${url}:`, error);
    return '';
  }
}

// Function to load components
async function loadComponents() {
  try {
    // Load header
    const headerElement = document.getElementById('header-placeholder');
    if (headerElement) {
      const headerHTML = await loadHTML('assets/includes/header.html');
      headerElement.outerHTML = headerHTML;
    }

    // Load footer  
    const footerElement = document.getElementById('footer-placeholder');
    if (footerElement) {
      const footerHTML = await loadHTML('assets/includes/footer.html');
      footerElement.outerHTML = footerHTML;
      
      // Reinitialize scroll to top functionality after footer is loaded
      initializeScrollToTop();
      
      // Initialize back button functionality
      initializeBackButton();
    }

    // Highlight current page in navigation
    highlightCurrentPage();
    
  } catch (error) {
    console.error('Error loading components:', error);
  }
}

// Function to highlight the current page in navigation
function highlightCurrentPage() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('nav a');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// Function to load head content (for dynamic title updates)
async function loadHead() {
  try {
    const headPlaceholder = document.getElementById('head-placeholder');
    if (headPlaceholder) {
      const headHTML = await loadHTML('assets/includes/head.html');
      headPlaceholder.innerHTML = headHTML;
    }
  } catch (error) {
    console.error('Error loading head component:', error);
  }
}

// Function to initialize scroll to top functionality
function initializeScrollToTop() {
  const topBtn = document.getElementById('scrollTopBtn');
  if (topBtn) {
    topBtn.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));
  }
}

// Function to initialize back button functionality  
function initializeBackButton() {
  const backBtn = document.querySelector('.back-btn');
  if (backBtn) {
    // Hide back button if there's no browser history
    if (window.history.length <= 1) {
      backBtn.style.display = 'none';
    }
  }
}

// Function to update page title and description
function updatePageMeta(title, description) {
  if (title) {
    document.title = title;
  }
  
  if (description) {
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }
  }
}

// Load components when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadComponents);
} else {
  loadComponents();
}