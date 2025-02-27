document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const todoInput = document.getElementById('todo-input');
    const sectionBtns = document.querySelectorAll('.section-btn');
    const archiveBtn = document.getElementById('archive-btn');
    const todoLists = document.querySelectorAll('.todo-list');
    
    // Current active section
    let activeSection = 'today';
    
    // Initialize todos from storage
    loadTodos();
    
    // Event Listeners
    todoInput.addEventListener('keypress', addTodo);
    sectionBtns.forEach(btn => btn.addEventListener('click', changeSection));
    archiveBtn.addEventListener('click', showArchive);
    
    // Initialize drag and drop
    initDragAndDrop();
    
    // Functions
    function addTodo(e) {
        if (e.key === 'Enter' && todoInput.value.trim() !== '') {
            const newTodo = {
                id: Date.now(),
                text: todoInput.value.trim(),
                section: activeSection,
                createdAt: new Date().toISOString()
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
    }
    
    function createTodoElement(todo) {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.section}`;
        li.draggable = true;
        li.dataset.id = todo.id;
        
        const span = document.createElement('span');
        span.className = 'todo-text';
        span.textContent = todo.text;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.addEventListener('click', function() {
            deleteTodo(todo.id);
        });
        
        li.appendChild(span);
        li.appendChild(deleteBtn);
        
        // Add drag events
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragend', handleDragEnd);
        
        return li;
    }
    
    function changeSection(e) {
        // Update active section
        sectionBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        activeSection = e.target.dataset.section;
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
        // This would open a new tab or dialog showing archived items
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
            todoElement.className = `todo-item ${newSection}`;
            
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
