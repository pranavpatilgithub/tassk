document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const todoInput = document.getElementById('todo-input');
    const sectionBtns = document.querySelectorAll('.section-btn');
    const archiveBtn = document.getElementById('archive-btn');
    const filterBtn = document.getElementById('filter-btn');
    const filterDropdown = document.getElementById('filter-dropdown');
    const filterItems = document.querySelectorAll('.filter-item');
    const todoLists = document.querySelectorAll('.todo-list');
    
    // Edit Modal Elements
    const editModal = document.getElementById('edit-modal');
    const editModalInput = document.getElementById('edit-modal-input');
    const editModalClose = document.getElementById('edit-modal-close');
    const editModalCancel = document.getElementById('edit-modal-cancel');
    const editModalSave = document.getElementById('edit-modal-save');
    let currentEditingTodoId = null;
    
    // Current active section and filter
    let activeSection = 'today';
    let activeFilter = 'all';
    
    // Initialize todos from storage
    loadTodos();
    
    // Event Listeners
    todoInput.addEventListener('keypress', addTodo);
    sectionBtns.forEach(btn => btn.addEventListener('click', changeSection));
    archiveBtn.addEventListener('click', showArchive);
    filterBtn.addEventListener('click', toggleFilterDropdown);
    filterItems.forEach(item => item.addEventListener('click', changeFilter));
    
    // Edit Modal Event Listeners
    editModalClose.addEventListener('click', closeEditModal);
    editModalCancel.addEventListener('click', closeEditModal);
    editModalSave.addEventListener('click', saveEditedTodo);
    
    // Close filter dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#filter-btn') && !e.target.closest('#filter-dropdown')) {
            filterDropdown.classList.remove('show');
        }
    });
    
    // Initialize drag and drop
    initDragAndDrop();
    
    // Functions
    function addTodo(e) {
        if (e.key === 'Enter' && todoInput.value.trim() !== '') {
            const newTodo = {
                id: Date.now(),
                text: todoInput.value.trim(),
                section: activeSection,
                createdAt: new Date().toISOString(),
                completed: false
            };
            
            // Add to DOM
            addTodoToDOM(newTodo);
            
            // Save to storage
            saveTodo(newTodo);
            
            // Clear input
            todoInput.value = '';
        }
    }
    
    function addTodoToDOM(todo) {
        const li = createTodoElement(todo);
        document.getElementById(`${todo.section}-list`).appendChild(li);
        
        // Apply current filter
        applyFilter(activeFilter);
    }
    
    function createTodoElement(todo) {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.section}${todo.completed ? ' completed' : ''}`;
        li.draggable = true;
        li.dataset.id = todo.id;
        
        const textDiv = document.createElement('div');
        textDiv.className = 'todo-text';
        textDiv.textContent = todo.text;
        
        // Create actions container
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'todo-actions';
        
        // Create copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-btn';
        copyBtn.title = 'Copy to clipboard';
        copyBtn.innerHTML = '<img src="/icons/copying.png" alt="Copy">';
        copyBtn.addEventListener('click', function() {
            copyToClipboard(todo.text);
        });
        
        // Create edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn';
        editBtn.title = 'Edit task';
        editBtn.innerHTML = '<img src="/icons/edit.png" alt="Edit">';
        editBtn.addEventListener('click', function() {
            openEditModal(todo.id, todo.text);
        });
        
        // Create complete button
        const completeBtn = document.createElement('button');
        completeBtn.className = 'action-btn';
        completeBtn.title = todo.completed ? 'Mark as incomplete' : 'Mark as complete';
        completeBtn.innerHTML = todo.completed ? 
            '<img src="/icons/check-completed.png" alt="Mark incomplete">' : 
            '<img src="/icons/check.png" alt="Mark complete">';
        completeBtn.addEventListener('click', function() {
            toggleComplete(todo.id);
        });
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn';
        deleteBtn.title = 'Delete task';
        deleteBtn.innerHTML = '<img src="/icons/delete.png" alt="Delete">';
        deleteBtn.addEventListener('click', function() {
            deleteTodo(todo.id);
        });
        
        // Add all action buttons
        actionsDiv.appendChild(copyBtn);
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(completeBtn);
        actionsDiv.appendChild(deleteBtn);
        
        li.appendChild(textDiv);
        li.appendChild(actionsDiv);
        
        // Add drag events
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragend', handleDragEnd);
        
        return li;
    }
    
    function openEditModal(todoId, todoText) {
        currentEditingTodoId = todoId;
        editModalInput.value = todoText;
        editModal.style.display = 'flex';
        editModalInput.focus();
    }
    
    function closeEditModal() {
        editModal.style.display = 'none';
        currentEditingTodoId = null;
    }
    
    function saveEditedTodo() {
        if (currentEditingTodoId && editModalInput.value.trim() !== '') {
            chrome.storage.local.get(['todos'], function(result) {
                const todos = result.todos || [];
                const todoIndex = todos.findIndex(todo => todo.id === currentEditingTodoId);
                
                if (todoIndex > -1) {
                    // Update in storage
                    todos[todoIndex].text = editModalInput.value.trim();
                    chrome.storage.local.set({ todos }, function() {
                        // Update in DOM
                        const todoElement = document.querySelector(`li[data-id="${currentEditingTodoId}"]`);
                        todoElement.querySelector('.todo-text').textContent = editModalInput.value.trim();
                        
                        // Close modal
                        closeEditModal();
                    });
                }
            });
        }
    }
    
    function toggleComplete(id) {
        chrome.storage.local.get(['todos'], function(result) {
            const todos = result.todos || [];
            const todoIndex = todos.findIndex(todo => todo.id === id);
            
            if (todoIndex > -1) {
                // Toggle completed status
                todos[todoIndex].completed = !todos[todoIndex].completed;
                
                // Update storage
                chrome.storage.local.set({ todos }, function() {
                    // Update DOM
                    const todoElement = document.querySelector(`li[data-id="${id}"]`);
                    if (todos[todoIndex].completed) {
                        todoElement.classList.add('completed');
                        todoElement.querySelector('.todo-actions button:nth-child(3) img').src = '/icons/check-completed.png';
                        todoElement.querySelector('.todo-actions button:nth-child(3)').title = 'Mark as incomplete';
                    } else {
                        todoElement.classList.remove('completed');
                        todoElement.querySelector('.todo-actions button:nth-child(3) img').src = '/icons/check.png';
                        todoElement.querySelector('.todo-actions button:nth-child(3)').title = 'Mark as complete';
                    }
                    
                    // Reapply filter
                    applyFilter(activeFilter);
                });
            }
        });
    }
    
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
                // Show a brief success message
                const notification = document.createElement('div');
                notification.className = 'copy-notification';
                notification.textContent = 'Copied!';
                document.body.appendChild(notification);
                
                // Remove notification after a short delay
                setTimeout(() => {
                    notification.remove();
                }, 1500);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
    }
    
    function changeSection(e) {
        // Update active section
        sectionBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        activeSection = e.target.dataset.section;
    }
    
    function toggleFilterDropdown() {
        filterDropdown.classList.toggle('show');
    }
    
    function changeFilter(e) {
        // Update active filter
        filterItems.forEach(item => item.classList.remove('active'));
        e.target.classList.add('active');
        activeFilter = e.target.dataset.filter;
        
        // Apply the filter
        applyFilter(activeFilter);
        
        // Close dropdown
        filterDropdown.classList.remove('show');
    }
    
    function applyFilter(filter) {
        const todoItems = document.querySelectorAll('.todo-item');
        
        todoItems.forEach(item => {
            if (filter === 'all') {
                item.style.display = '';
            } else if (filter === 'completed') {
                item.style.display = item.classList.contains('completed') ? '' : 'none';
            } else {
                item.style.display = item.classList.contains(filter) ? '' : 'none';
            }
        });
    }
    
    function deleteTodo(id) {
        // Get all todos
        chrome.storage.local.get(['todos', 'archive'], function(result) {
            let todos = result.todos || [];
            let archive = result.archive || [];
            
            // Find todo to archive
            const todoIndex = todos.findIndex(todo => todo.id === id);
            
            if (todoIndex > -1) {
                // Move to archive
                const archivedTodo = todos[todoIndex];
                archivedTodo.archivedAt = new Date().toISOString();
                archive.push(archivedTodo);
                
                // Remove from todos
                todos.splice(todoIndex, 1);
                
                // Update storage
                chrome.storage.local.set({ todos, archive }, function() {
                    // Remove from DOM
                    document.querySelector(`li[data-id="${id}"]`).remove();
                });
            }
        });
    }
    
    function loadTodos() {
        chrome.storage.local.get(['todos'], function(result) {
            const todos = result.todos || [];
            todos.forEach(todo => addTodoToDOM(todo));
        });
    }
    
    function saveTodo(todo) {
        chrome.storage.local.get(['todos'], function(result) {
            const todos = result.todos || [];
            todos.push(todo);
            chrome.storage.local.set({ todos });
        });
    }
    
    function showArchive() {
        // Open archive page in a new tab
        chrome.tabs.create({ url: 'archive.html' });
    }
    
    // Drag and Drop Functions
    function initDragAndDrop() {
        todoLists.forEach(list => {
            list.addEventListener('dragover', handleDragOver);
            list.addEventListener('dragenter', handleDragEnter);
            list.addEventListener('dragleave', handleDragLeave);
            list.addEventListener('drop', handleDrop);
        });
    }
    
    function handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.id);
        e.target.classList.add('dragging');
    }
    
    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }
    
    function handleDragOver(e) {
        e.preventDefault();
    }
    
    function handleDragEnter(e) {
        e.preventDefault();
        if (e.target.classList.contains('todo-list')) {
            e.target.classList.add('drag-over');
        }
    }
    
    function handleDragLeave(e) {
        if (e.target.classList.contains('todo-list')) {
            e.target.classList.remove('drag-over');
        }
    }
    
    function handleDrop(e) {
        e.preventDefault();
        
        const id = e.dataTransfer.getData('text/plain');
        const todoElement = document.querySelector(`li[data-id="${id}"]`);
        const targetList = e.target.closest('.todo-list');
        
        if (targetList) {
            targetList.classList.remove('drag-over');
            const newSection = targetList.dataset.section;
            
            // Move in DOM
            targetList.appendChild(todoElement);
            
            // Update class
            todoElement.className = `todo-item ${newSection}${todoElement.classList.contains('completed') ? ' completed' : ''}`;
            
            // Update in storage
            updateTodoSection(id, newSection);
        }
    }
    
    function updateTodoSection(id, newSection) {
        chrome.storage.local.get(['todos'], function(result) {
            const todos = result.todos || [];
            const todoIndex = todos.findIndex(todo => todo.id.toString() === id);
            
            if (todoIndex > -1) {
                todos[todoIndex].section = newSection;
                chrome.storage.local.set({ todos });
            }
        });
    }
});