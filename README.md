# Tech-Tree-Todo
Motivation: todo lists are unappealing and disconnected from why one is doing something.
Concept: instead of describing what needs to be done, present yourself with viscerally appealing images of what you want. You then notice what things you need to accomplish that, and represent those visually and mark them as dependencies. By making incredibly visually clear what your objective is, the actions to take them are straight forward and immediately connected to outcomes you desire. 

Click-drag images you want or copy-paste image data to create nodes.
pg up-down to change view.
Nodes only save when you click 'save' or click on another node.
Click-drag a node onto another node to mark it as a dependency. Alternative click-drag from the little circle to make a little arrow that does the same thing.
To delete a dependency, click on the connecting line.

4 views:
* tech tree - everything is visible, here you can set connections and make new nodes here.
* task view - Your 'todo list' - the dependencyless non-hidden marked-visible-now not-waiting nodes. 
* waiting - anything marked 'waiting' that is not marked 'hidden'
* done - anything marked 'done' 

Setting the visibility by day only should affect the task view. 


There are probably lots of bugs and weird stuff as this code was primarily generated with ChatGPT. It's just a prototype. I made it quickly to try it out without much thought.
But people expressed interest, so here it is.

```
nix develop
npm init -y
npm install express multer cors uuid
node server.js
```
it is then available at http://localhost:3000/ in your browser.
