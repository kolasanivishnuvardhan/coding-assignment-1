const {format} = require('date-fns')
const express = require('express')
const isValid = require('date-fns/isValid')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const app = express()
app.use(express.json())

//initialize db and server
let db
const dbPath = path.join(__dirname, 'todoApplication.db')
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server started!!')
    })
  } catch (e) {
    console.log(`ERROR : ${e.message}`)
    process.exit(1)
  }
}
initializeDbAndServer()

// for required response
function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

const statusValues = ['TO DO', 'IN PROGRESS', 'DONE']
const priorityValues = ["HIGH","MEDIUM","LOW"]
const categoryValues = ["WORK","HOME","LEARNING"]

// api 1

app.get('/todos/', async (request, response) => {
  const {priority, status, category, search_q, due_date} = request.query
  const value = []
  const key = []
  if (priority !== undefined) {
    key.push('priority = ?')
    if(priorityValues.includes(priority)){
        value.push(priority)
    }else{
      return response.status(400).send("Invalid Todo Priority")
    }
  }
  if (status !== undefined) {
    key.push('status = ?')
    if(statusValues.includes(status)){
      value.push(status)
    }else{
      return response.status(400).send("Invalid Todo Status")

    }
  }
  if (category !== undefined) {
    key.push('category = ?')
    if(categoryValues.includes(category)){
       value.push(category)   
    }else{
      return response.status(400).send("Invalid Todo Category")
    }
  }
  if (search_q !== undefined) {
    key.push('todo LIKE ?')
    value.push(`%${search_q}%`)
  }
  if (due_date !== undefined) {
    if (isValid(new Date(due_date))) {
      key.push('due_date = ?')
      const formatedDate = format(new Date(due_date), 'yyyy-MM-dd')
      value.push(`${formatedDate}`)
    } else {
      response.status(400)
      response.send('Invalid Due Date')
    }
  }

  let getTodosQuery = `
  select 
    id,
    todo,
    priority,
    status,
    category,
    due_date as dueDate
  from
    todo
  `
  if (key.length > 0) {
    getTodosQuery += ' where ' + key.join(' AND ')
  }

  const todo = await db.all(getTodosQuery, value)
  if (todo !== undefined) {
    response.send(todo)
  } else {
    response.status(400)
    response.send(`Invalid Todo ${capitalizeFirstLetter(key)}`)
  }
}) //api 1 completed

// api 2 Returns a specific todo based on the todo ID
app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const getTodoQuery = `
  select
    id,
    todo,
    priority,
    status,
    category,
    due_date as dueDate    
  from
    todo
  where
    id = ${todoId};
  `
  const todo = await db.get(getTodoQuery)
  response.send(todo)
}) //api 2 completed

// api 3 Returns a list of all todos with a specific due date in the query parameter

app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  if (isValid(new Date(date))) {
    const newDate = format(new Date(date), 'yyyy-MM-dd')
    const getTodosQuery = `
      select
        id,
        todo,
        priority,
        status,
        category,
        due_date as dueDate
      from
        todo
      where
        due_date = '${newDate}';
      `
    const todo = await db.all(getTodosQuery)
    response.send(todo)
  } else {
    response.status(400)
    response.send('Invalid Due Date')
  }
}) // api 3 completed

// api 4 Create a todo in the todo table,
app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body
  if(!priorityValues.includes(priority)){
      return response.status(400).send("Invalid Todo Priority")
    }
  if(!statusValues.includes(status)){
      return response.status(400).send("Invalid Todo Status")

    }
  if(!categoryValues.includes(category)){
      return response.status(400).send("Invalid Todo Category")

    }


  if (isValid(new Date(dueDate))) {
    //date is valid
    const formatedDate = format(new Date(dueDate), 'yyyy-MM-dd')
    const insertTodoQuery = `
    insert into todo(id,todo,priority,status,category,due_date)
    values(${id},'${todo}','${priority}','${status}','${category}','${formatedDate}');    
    `
    await db.run(insertTodoQuery)
    response.send('Todo Successfully Added')
  } else {
    response.status(400)
    response.send('Invalid Due Date')
  }
}) // api 4 completd

// api 5 Updates the details of a specific todo based on the todo ID
app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const getPreviousTodoQuery = `
  select
    *
  from
    todo
  where
    id = ${todoId};
  `
  let query
  const previousTodo = await db.get(getPreviousTodoQuery)
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body

  if(!priorityValues.includes(priority)){
      return response.status(400).send("Invalid Todo Priority")
    }
  if(!statusValues.includes(status)){
      return response.status(400).send("Invalid Todo Status")

    }
  if(!categoryValues.includes(category)){
      return response.status(400).send("Invalid Todo Category")

    }
  if (request.body.todo !== undefined) {
    query = 'Todo'
  }
  if (request.body.priority !== undefined) {
    query = 'Priority'
  }
  if (request.body.status !== undefined) {
    query = 'Status'
  }
  if (request.body.category !== undefined) {
    query = 'Category'
  }
  if (request.body.dueDate !== undefined) {
    query = 'Due Date'
  }
  console.log(dueDate)
  if (isValid(new Date(dueDate))) {
    //date is valid
    const formatedDate = format(new Date(dueDate), 'yyyy-MM-dd')
    const insertTodoQuery = `
    update todo
    set 
        todo = '${todo}',
        priority = '${priority}',
        status = '${status}',
        category = '${category}',
        due_date = '${formatedDate}'
    where
        id = ${todoId};
    `
    await db.run(insertTodoQuery)
    response.send(`${query} Updated`)
  } else {
    response.status(400)
    response.send('Invalid Due Date')
  }
}) // api 5 completed

// api 6 Deletes a todo from the todo table based on the todo ID
app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteTodoQuery = `
  delete from todo
  where
    id = ${todoId};
  `
  await db.run(deleteTodoQuery)
  response.send('Todo Deleted')
})

module.exports = app
