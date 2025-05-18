document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const archiveList = document.getElementById('archive-list');
    const emptyMessage = document.getElementById('empty-message');
    const backBtn = document.getElementById('back-btn');
    
    // Load archived todos
    loadArchive();
    
    // Event Listeners
    backBtn.addEventListener('click', function() {
        window.close();
    });
    
    function loadArchive() {
        chrome.storage.local.get(['archive'], function(result) {
            const archive = result.archive || [];
            
            // Clean up archives older than 1 day
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);
            
            const filteredArchive = archive.filter(todo => {
                const archivedDate = new Date(todo.archivedAt);
                return archivedDate > oneDayAgo;
            });
            
            // Save filtered archive
            if (filteredArchive.length !== archive.length) {
                chrome.storage.local.set({ archive: filteredArchive });
            }
            
            // Display archives
            if (filteredArchive.length === 0) {
                emptyMessage.style.display = 'block';
            } else {
                emptyMessage.style.display = 'none';
                displayArchive(filteredArchive);
            }
        });
    }
    
    function displayArchive(archive) {
        // Sort by archived date (newest first)
        archive.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
        
        // Clear list
        archiveList.innerHTML = '';
        
        // Add items to DOM
        archive.forEach(item => {
            const li = document.createElement('li');
            li.className = `archive-item ${item.section}`;
            li.dataset.id = item.id;
            
            const textDiv = document.createElement('div');
            textDiv.className = 'archive-text';
            
            const textContent = document.createElement('div');
            textContent.textContent = item.text;
            
            const metaContent = document.createElement('div');
            metaContent.className = 'archive-meta';
            
            // Format dates
            const archivedDate = new Date(item.archivedAt);
            const formattedDate = formatDate(archivedDate);
            
            metaContent.textContent = `From: ${formatSectionName(item.section)} · Archived: ${formattedDate}`;
            
            textDiv.appendChild(textContent);
            textDiv.appendChild(metaContent);
            
            // Create button group
            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'button-group';
            
            // Restore button
            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'restore-btn';
            restoreBtn.textContent = 'Restore';
            restoreBtn.addEventListener('click', function() {
                restoreTodo(item.id);
            });
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', function() {
                deletePermanently(item.id);
            });
            
            buttonGroup.appendChild(restoreBtn);
            buttonGroup.appendChild(deleteBtn);
            
            li.appendChild(textDiv);
            li.appendChild(buttonGroup);
            
            archiveList.appendChild(li);
        });
    }
    
    function formatSectionName(section) {
        return section.charAt(0).toUpperCase() + section.slice(1);
    }
    
    function formatDate(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMs / 3600000);
        
        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins} minutes ago`;
        } else if (diffHrs < 24) {
            return `${diffHrs} hours ago`;
        } else {
            return date.toLocaleString();
        }
    }
    
    function restoreTodo(id) {
        chrome.storage.local.get(['todos', 'archive'], function(result) {
            let todos = result.todos || [];
            let archive = result.archive || [];
            
            // Find archived todo
            const archivedIndex = archive.findIndex(todo => todo.id === id);
            
            if (archivedIndex > -1) {
                // Move to todos
                const restoredTodo = archive[archivedIndex];
                delete restoredTodo.archivedAt;
                todos.push(restoredTodo);
                
                // Remove from archive
                archive.splice(archivedIndex, 1);
                
                // Update storage
                chrome.storage.local.set({ todos, archive }, function() {
                    // Remove from DOM
                    document.querySelector(`li[data-id="${id}"]`).remove();
                    
                    // Show empty message if necessary
                    if (archive.length === 0) {
                        emptyMessage.style.display = 'block';
                    }
                });
            }
        });
    }
    
    function deletePermanently(id) {
        chrome.storage.local.get(['archive'], function(result) {
            let archive = result.archive || [];
            
            // Find archived todo
            const archivedIndex = archive.findIndex(todo => todo.id === id);
            
            if (archivedIndex > -1) {
                // Remove from archive
                archive.splice(archivedIndex, 1);
                
                // Update storage
                chrome.storage.local.set({ archive }, function() {
                    // Remove from DOM
                    document.querySelector(`li[data-id="${id}"]`).remove();
                    
                    // Show empty message if necessary
                    if (archive.length === 0) {
                        emptyMessage.style.display = 'block';
                    }
                });
            }
        });
    }
});