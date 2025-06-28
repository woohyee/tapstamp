<script>
  let { error } = $props();
</script>

<div class="max-w-md mx-auto p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
  <div class="text-center">
    <div class="text-6xl mb-4">🔥</div>
    <h2 class="text-xl font-bold text-red-800 dark:text-red-200 mb-4">
      Firebase Configuration Required
    </h2>
    <p class="text-red-700 dark:text-red-300 mb-6">
      {error}
    </p>
    
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-700 text-left">
      <h3 class="font-semibold text-gray-900 dark:text-white mb-3">
        📋 Setup Instructions:
      </h3>
      <ol class="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
        <li>Go to <a href="https://console.firebase.google.com" target="_blank" class="text-blue-600 hover:underline">Firebase Console</a></li>
        <li>Create a new project or select existing one</li>
        <li>Go to Project Settings → General → Your apps</li>
        <li>Click "Add app" → Web app (<code>&lt;/&gt;</code>) → Register app</li>
        <li>Copy the Firebase config object</li>
        <li>Replace the config in <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">src/lib/firebase.js</code></li>
        <li>Enable Authentication → Sign-in method → Anonymous</li>
        <li>Create Firestore Database → Start in test mode</li>
      </ol>
    </div>
    
    <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <p class="text-sm text-blue-800 dark:text-blue-200">
        💡 <strong>Tip:</strong> After setup, refresh this page to continue.
      </p>
    </div>
  </div>
</div>
