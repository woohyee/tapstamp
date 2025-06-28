<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth.js';
  import { addStamp } from '$lib/stores/stamps.js';
  
  let locationId = $state('');
  let currentUser = $state(null);
  let loading = $state(false);
  let error = $state('');
  let success = $state(false);
  let newStamp = $state(null);
  
  onMount(() => {
    locationId = $page.params.locationId;
    
    const unsubscribe = user.subscribe(async (u) => {
      if (!u) {
        // Redirect to registration with return URL
        goto(`/register?returnTo=${encodeURIComponent($page.url.pathname)}`);
        return;
      }
      
      currentUser = u;
      await handleStampCollection();
    });
    
    return unsubscribe;
  });
  
  async function handleStampCollection() {
    if (!currentUser || !locationId) return;
    
    loading = true;
    error = '';
    
    try {
      const stamp = await addStamp(currentUser.uid, locationId);
      newStamp = stamp;
      success = true;
      
      // Auto redirect to stamp book after 3 seconds
      setTimeout(() => {
        goto('/stampbook');
      }, 3000);
      
    } catch (err) {
      error = err.message || 'Failed to add stamp. Please try again.';
    } finally {
      loading = false;
    }
  }
  
  function goToStampBook() {
    goto('/stampbook');
  }
</script>

<div class="text-center space-y-6">
  {#if loading}
    <div class="py-12">
      <div class="text-6xl mb-4">⏳</div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Adding your stamp...
      </h1>
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
    </div>
  {:else if success && newStamp}
    <div class="py-12 animate-bounce-in">
      <div class="text-8xl mb-6">🎉</div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Stamp Added!
      </h1>
      
      <div class="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-xl mx-4 mb-6">
        <div class="text-3xl mb-2">{newStamp.locationName}</div>
        <div class="text-sm opacity-90">
          Added on {new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(newStamp.timestamp)}
        </div>
      </div>
      
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        Redirecting to your stamp book in a few seconds...
      </p>
      
      <button
        onclick={goToStampBook}
        class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        View My Stamp Book 📖
      </button>
    </div>
  {:else if error}
    <div class="py-12">
      <div class="text-6xl mb-4">😔</div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Oops! Something went wrong
      </h1>
      
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-lg mx-4 mb-6">
        {error}
      </div>
      
      <div class="space-y-3">
        <button
          onclick={handleStampCollection}
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Try Again 🔄
        </button>
        
        <button
          onclick={goToStampBook}
          class="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Go to Stamp Book 📖
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  @keyframes bounce-in {
    0% { transform: scale(0.3); opacity: 0; }
    50% { transform: scale(1.05); }
    70% { transform: scale(0.9); }
    100% { transform: scale(1); opacity: 1; }
  }
  
  .animate-bounce-in {
    animation: bounce-in 0.6s ease-out;
  }
</style>
