<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { user, loading, firebaseError } from '$lib/stores/auth.js';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import FirebaseError from '$lib/components/FirebaseError.svelte';
  
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


  <!-- Main Content -->
  <main class="min-h-screen flex items-center justify-center px-4 py-8">
    {#if $firebaseError}
      <FirebaseError error={$firebaseError} />
    {:else if $loading}
      <LoadingSpinner />
    {:else}
      {@render children?.()}
    {/if}
  </main>
</div>
