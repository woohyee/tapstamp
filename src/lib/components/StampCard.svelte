<script>
  let { stamp } = $props();
  
  function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
</script>

<div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700 transform hover:scale-105 transition-transform duration-200">
  <div class="text-2xl mb-2">{stamp.locationName}</div>
  <div class="text-sm text-gray-600 dark:text-gray-400">
    {formatDate(stamp.timestamp)}
  </div>
  <div class="mt-3 flex items-center justify-between">
    <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
      Stamp #{stamp.id.slice(-6)}
    </span>
    <div class="text-2xl">✨</div>
  </div>
</div>
