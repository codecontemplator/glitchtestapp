'use strict';

// client-side js
// run by the browser each time your view template is loaded

// by default, you've got jQuery,
// add other scripts at the bottom of index.html

// https://glitch.com/edit/#!/memory-preact-unsplash?path=public/client.js:5:0

const {Component, render, h} = window.preact;

function fetchListItems(listId = "2017") {
  return  $.ajax({
      url: "/list/" + listId + "/items",
      dataType: "json",
  });    
}

function fetchUserInfo() {
  return  $.ajax({
      url: "/userinfo",
      dataType: "json",
  });  
}

function storeListItem(item, listId = "2017") {
  $.ajax({
    url: "/list/" + listId + "/items/" + item.id,
    type: "PUT",
    data: JSON.stringify({ owner:item.owner, date: item.date, changeLog: item.changeLog }),
    contentType: 'application/json',
    success: function() {
      console.log("Stored!")
    },
    error: function(e) {
      console.log("Error " + JSON.stringify(e))
    }  
  });
}

function beginEditListItem(itemId, listId = "2017") {
  $.ajax({
    url: "/list/" + listId + "/items/" + itemId + "/_beginedit",
    type: "POST",
    contentType: 'application/json',
    success: function() {
      console.log("Locked!")
    },
    error: function(e) {
      console.log("Error " + JSON.stringify(e))
    }  
  });  
}

function endEditListItem(itemId, listId = "2017") {
  $.ajax({
    url: "/list/" + listId + "/items/" + itemId + "/_endedit",
    type: "POST",
    contentType: 'application/json',
    success: function() {
      console.log("Unlocked!")
    },
    error: function(e) {
      console.log("Error " + JSON.stringify(e))
    }  
  });  
}

const ListItemHistory = ({changeLog}) => {
    var result = null;
    if (changeLog && changeLog.length > 0) {
      result = h('span', {
        className:'glyphicon glyphicon-list',
        'data-toggle':'tooltip',
        'data-placement':'right',
        title: changeLog.map(({ timestamp, owner }) => timestamp.substring(0,16) + " " + owner).join('</br>')
      });
    }
    return result; 
  }

class ListItemRow extends Component {
  constructor(props) {
    super(props);    
    
    this.state = {
       owner: this.props.listItem.owner         
    };     
    
    this.onKeyUpOwnerTextBox = this.onKeyUpOwnerTextBox.bind(this);    
    this.editable = this.props.listItem.editable;
  }
  
  componentWillReceiveProps(nextProps, nextState) {
      if (!this.editable && nextProps.listItem.editable) {
        beginEditListItem(this.props.listItem.id);        
        this.setState({owner: this.props.listItem.owner });
      }
    
      if (this.editable && !nextProps.listItem.editable) {
        endEditListItem(this.props.listItem.id);                
      }
    
      this.editable = nextProps.listItem.editable;
  }

  onKeyUpOwnerTextBox(e, listItem) {
    this.setState({ owner: e.target.value }); 
    this.props.handleKeyUp(e, listItem);
  }
  
  render({listItem, handleClick, handleMouseOver, handleKeyUp, handleChange}, state) {
      return <tr onMouseOver={() => handleMouseOver(listItem)}>
                <td width='30px'>
                  {listItem.locked &&
                    <span className="glyphicon glyphicon-lock" />
                  }
                </td>              
                <td width='30px'>
                  {listItem.selected && !listItem.locked &&
                    <a href='#' onClick={() => handleClick(listItem)}>
                      <span className="glyphicon glyphicon-edit" />
                    </a>                  
                  }
                </td>
                <td width='120px'>
                  {listItem.date}
                </td>
                <td width='300px'>
                  <div>
                    { listItem.editable ? (
                      <input 
                          style="width:'100%; padding:'2px'" 
                          type='text' 
                          value={this.state.owner} 
                          onKeyUp={(e) => this.onKeyUpOwnerTextBox(e, listItem)} 
                          onChange={(e) => handleChange(e, listItem)} />
                     ) : (
                      <span>{listItem.owner}</span>                    
                     )
                    }
                  </div>
                </td>
                <td width='200px'>
                  <ListItemHistory changeLog={listItem.changeLog} />
                </td>
             </tr>
  }
}

const ListItemsTable = ({listItems, handleClick, handleMouseOver, handleKeyUp, handleChange }) => 
    h('table', 
      { className: 'table table-striped'}, 
      [
        h('thead', null, [
          h('tr', null, [
            h('th', null, " "),
            h('th', null, " "),
            h('th', null, "date"),
            h('th', null, "name"),
            h('th', null, "history")
          ])
        ]),
        h('tbody', null, 
          listItems.map((listItem => h(ListItemRow, { listItem, handleClick, handleMouseOver, handleKeyUp, handleChange })))
        )
      ]
     )

class App extends Component {
  constructor(props) {
    super(props);    
    
    this.state = {
       listItems: this.props.listItems.map(b => ({ 
         id:b.id, 
         owner:b.owner, 
         changeLog:b.changeLog, 
         date:b.date, 
         editable:false,
         selected:false
         
       }))
    };    
    
    this.handleClickedListItem = this.handleClickedListItem.bind(this);
    this.handleMouseOverListItem = this.handleMouseOverListItem.bind(this);
    this.handleKeyUpListItem = this.handleKeyUpListItem.bind(this);
    this.handleChangedListItem = this.handleChangedListItem.bind(this);
    
    this.socket = io();
    const self = this;
    this.socket.on('item-updated', argListItem => self.updateClientListItem(argListItem.id, argListItem.owner, argListItem.changeLog));    
    this.socket.on('begin-item-edit', data => {
      console.log("begin-item-edit " + JSON.stringify(data));
      self.updateListItem(data.itemId, (b) => ({ locked: true }));
    });    
    this.socket.on('end-item-edit', data => {
      self.updateListItem(data.itemId, (b) => ({ locked: false }));
    });    
  }

  merge(obj1, obj2)
  {
    for (var attrname in obj2) { 
      obj1[attrname] = obj2[attrname]; 
    }
  }
      
  updateListItem(id, idFunc, nonIdFunc)
  {
      this.setState(({listItems}) => {
        listItems: listItems.map(b => {
          if (b.id == id) {
            var b1 = idFunc(b);
            return this.merge(b, b1);
          } else {
            var b1 = nonIdFunc ? nonIdFunc(b) : b;
            return this.merge(b, b1);
          }
        })
      });    
  }
  
  handleClickedListItem(argListItem) {  
    this.updateListItem(
      argListItem.id,
      (b) => ({ editable: !b.editable }),
      (b) => ({ editable: false })
    );       
  }
  
  handleMouseOverListItem(argListItem) {
    this.updateListItem(
      argListItem.id,
      (b) => ({ selected: true }),
      (b) => ({ selected: false })
    );                 
  }
  
  handleKeyUpListItem(e,argListItem) {
    //console.log('keyup.... ' + Object.keys(val));
    if (e.keyCode == 13) {
      this.updateListItem(
        argListItem.id,
        (b) => ({ owner: e.target.value, editable: false }),
        (b) => ({ })
      );                       
    }    
  }
  
  handleChangedListItem(e,argListItem) {
      this.updateClientListItem(argListItem.id, e.target.value);
      storeListItem(argListItem);
  }

  updateClientListItem(itemId, newOwner, changeLog) {
      const addEntryToChangeLog = function(b) {
        const entry = {timestamp:new Date().toLocaleString(), owner:b.owner};
        if (b.changeLog) {
          return b.changeLog.concat([entry]);
        }
        else {
          return [entry]
        }
      }
      
      this.updateListItem(
        itemId,
        (b) => ({ owner: newOwner, changeLog: changeLog ? changeLog : addEntryToChangeLog(b)})
      );     
  }
  
  componentDidMount() {
      $('[data-toggle="tooltip"]').tooltip({ html: true });         
  }

  componentDidUpdate() {
      // ref: https://stackoverflow.com/questions/9501921/change-twitter-bootstrap-tooltip-content-on-click
      $('[data-toggle="tooltip"]').tooltip('fixTitle');
  }
    
  render(props, state) {
    return <div className="app">
              <ListItemsTable 
                listItems={state.listItems} 
                handleClick={this.handleClickedListItem}
                handleMouseOver={this.handleMouseOverListItem}
                handleKeyUp={this.handleKeyUpListItem}
                handleChange={this.handleChangedListItem} />
           </div>
  }  
}
    
// Entry point for application
(function start() {
  Promise.all([fetchUserInfo(),fetchListItems()]).then(
    ([userInfo,listItems]) => {
       console.log("ui="+JSON.stringify(userInfo));      
      console.log("listItems="+JSON.stringify(listItems));
       return render(h(App, { listItems, userInfo }), document.getElementById('root'));
    }
   )
   ;
}());
