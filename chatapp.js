// Richard Chou
// Simple test chat server
// based off O'Reilly intro to node.js tutorial:
// http://chimera.labs.oreilly.com/books/1234000001808/ch02.html#I_sect12_d1e1211
// http://www.davidmclifton.com/2011/07/22/simple-telnet-server-in-node-js/

var net = require('net');

var chatServer = net.createServer();
var clientList = [];
var chatRooms = [{roomname:"none", users:0}, 
				 {roomname:"pad", users:0}, 
				 {roomname:"gungho", users:0}
				];

chatServer.on('connection', function(client) 
{

	newUserConnect(client);

	client.on('end', function()
	{
		console.log(client.name + ' quit');
		clientList.splice(clientList.indexOf(client), 1);
	});

	client.on('error', function(e) 
	{
		console.log(e);
	});
})

// runs whenever a new person connects
function newUserConnect(client)
{
	client.name = client.remoteAddress + ':' + client.remotePort;
	client.userName = "";
	client.nameSet = false;
	client.chatroom = chatRooms[0].roomname;
	clientList.push(client);
	client.write('Welcome to the GungHo test chat server\n'+
				 'Please enter a login name\n');

	client.on('data', function(data) 
	{
		// check for username and set if it doesn't exist.
		data = data.toString().trim();
		
		var dataArr = [];
		dataArr = data.split(" ");

		if(client.nameSet)
		{
			// broadcast to chat room
			if (data.charAt(0) == '/')
			{
				if(dataArr[0] == "/rooms")
				{
					listChatRooms(client);
				}
				else if(dataArr[0] == "/join")
				{
					joinChatRoom(dataArr, client);
				}
				else if(dataArr[0] == "/leave")
				{
					leaveChatRoom(client);
				}
				else if(dataArr[0] =="/quit")
				{
					quit(client);
				}	
				else 
				{
					client.write("That is not a valid command\n" +
					 			 "Valid commands are: /rooms, /join, /leave, and /quit\n");
				}

			}
			// standard chat message
			else
			{
				if(client.chatroom == chatRooms[0].roomname)
				{
					client.write("* Please join a chatroom, type /rooms to see available rooms \n");
				}
				else
				{
					data = client.userName + ": " + data;
					broadcast(data, client);
				}

			}

		}
		else
		{
			selectUserName(client, data);
		}
	});


}

// broadcast chat message
function broadcast(message, client) 
{
	var cleanup = [];

	for(var i = 0; i < clientList.length; ++i) 
	{
		if (client !== clientList[i]) 
		{
			if (clientList[i].writable) 
			{
				// make sure to only send messages to people in same chatroom
				if (client.chatroom == clientList[i].chatroom)
				{
					clientList[i].write(message + "\n");
				}
			}
			else 
			{
				cleanup.push(clientList[i]);
				clientList[i].destroy();
			}
		}
	} 
	// Remove dead nodes out of write loop to avoid trashing loop index
	for (var i = 0; i < cleanup.length; ++i) 
	{
		clientList.splice(clientList.indexOf(cleanup[i]), 1);
	}
}

// select user name
function selectUserName(client, data)
{
		if (!client.nameSet)
		{	
			if (data != "")
			{
				if (checkExistingName(data) == false)
				{
					for (var i = 0; i < clientList.length; ++i)
					{
						if (client.name == clientList[i].name)
						{
							clientList[i].userName = data;
							clientList[i].nameSet = true;
							client.nameSet = true;
							client.userName = data;
							client.write('Your user name has been set to: ' + client.userName + '\n');
						}
					}
				}
				else
				{
					client.write('That name already is taken, please choose another one.\n');
				}
			}
			else
			{
				client.write('Please enter a valid user name.\n');
			}

		}

}

// check if name already exists on chat server
function checkExistingName(name)
{
	var nameExists = false;
	for (var i = 0; i < clientList.length; ++i)
	{
		if (name.toString() == clientList[i].userName)
		{
			nameExists = true;
		}
	}
	return nameExists;
}

// Join a chat room
function joinChatRoom(dataArr, client)
{
	var joinedRoom = false;
	var joinedMsg = "* New user has joined chat: " + client.userName;
	if (dataArr.length == 2)
	{
		if (client.chatroom == dataArr[1] && client.chatroom != chatRooms[0].roomname)
		{
			client.write("* You are already in chatroom: " + dataArr[1] + "\n");
			return;
		}

		// check for proper chatroom entry
		// change user chatroom name and increase number of users in the room
		for (var i = 1; i < chatRooms.length; ++i)
		{
				if (dataArr[1] == chatRooms[i].roomname)
				{
					client.chatroom = chatRooms[i].roomname;
					chatRooms[i].users += 1;	
					client.write("* Entering chatroom: " + chatRooms[i].roomname + "\n");
					broadcast(joinedMsg, client);
					joinedRoom = true;
				}
		}

		if(!joinedRoom)
		{
			client.write("* That chatroom does not exist \n");
		}

	}
	else
	{
		client.write("* Sorry, that is not proper usage\n"+
					 "  Proper usage: /join roomName\n");
	}

	// set chatroom in array of clients
	if (joinedRoom)
	{
		for (var i = 0; i < clientList.length; ++i)
		{
			if (client.name == clientList[i].name)
			{
				clientList[i].chatroom = client.chatroom;
			}
		}

		listChatRoomMembers(client);
	}
}

function listChatRoomMembers(client, chatroom)
{
	client.write("Active users: \n");
	for (var i = 0; i < clientList.length; ++i)
	{
		if( clientList[i].chatroom == client.chatroom)
		{
			if (client.name == clientList[i].name)
			{
				client.write("* " + clientList[i].userName + "  (** This is you)\n");
			}
			else
			{
				client.write("* " + clientList[i].userName + "\n");
			}
		}
	}
	client.write("End of list.\n");
}

// list chat rooms
function listChatRooms(client)
{
	client.write("Available chat rooms are: \n");
	for (var i = 1; i < chatRooms.length; ++i)
	{
		client.write("* " + chatRooms[i].roomname + " (" + chatRooms[i].users + ")\n");
	}
	client.write("End of list.\n");
}

function leaveChatRoom(client)
{
	var msg = "* user has left chat: " + client.userName;

	broadcast(msg, client);

	// decrement chatroom by 1 user
	for (var i = 0; i < chatRooms.length; ++i)
	{
		if (client.chatroom == chatRooms[i].roomname && client.chatroom != chatRooms[0].roomname && chatRooms[i].users > 0)
		{
			chatRooms[i].users = chatRooms[i].users - 1;
		}
	}

	for (var i = 0; i < clientList.length; ++i)
	{
		if (client.name == clientList[i].name)
		{
			clientList[i].chatroom = chatRooms[0].roomname;
		}
	}

	client.chatroom = chatRooms[0].roomname;
	client.write(msg + " (** This is you) \n");
}

//quit chat server
function quit(client)
{	
	if (client.chatroom != chatRooms[0].roomname)
	{
		leaveChatRoom(client);
	}
	client.end("GOODBYE!\n");
}

chatServer.listen(9000);