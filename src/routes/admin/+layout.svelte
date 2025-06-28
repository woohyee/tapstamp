<script lang="ts">
  import '../../app.css';
  import { onMount } from 'svelte';
  
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
  
  let darkMode = $state(false);
  
  onMount(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme');
    darkMode = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    updateTheme();
  });
  
  function toggleDarkMode() {
    darkMode = !darkMode;
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    updateTheme();
  }
  
  function updateTheme() {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
</script>

<div class="min-h-screen">
  <!-- Admin Header -->
  <header class="bg-blue-600 dark:bg-blue-800 border-b border-blue-500 dark:border-blue-700 sticky top-0 z-50">
    <div class="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
      <div class="text-xl font-bold text-white">
        👨‍💼 관리자 모드
      </div>
      <button
        onclick={toggleDarkMode}
        class="p-2 rounded-lg bg-blue-500 dark:bg-blue-700 text-white hover:bg-blue-400 dark:hover:bg-blue-600 transition-colors"
        aria-label="Toggle dark mode"
      >
        {darkMode ? '☀️' : '🌙'}
      </button>
    </div>
  </header>

  <!-- Admin Content -->
  <main>
    {@render children?.()}
  </main>
</div> 