// client-side js
// run by the browser each time your view template is loaded

// by default, you've got jQuery,
// add other scripts at the bottom of index.html

// https://glitch.com/edit/#!/memory-preact-unsplash?path=public/client.js:5:0

const {Component, render, h} = window.preact;

function fetchBookings() {
  return fetch('/bookings').then(res => {
    if (res.ok) {
      return res.json(); 
    } else {
      throw "failed to load bookings";
    }
  });
}

function storeBooking(booking) {
  $.ajax({
    url: "/bookings/" + booking.id,
    type: "PUT",
    data: JSON.stringify({ id:booking.id, owner:booking.owner, date: booking.date, changeLog: booking.changeLog }),
    contentType: 'application/json',
    success: function() {
      console.log("Stored!")
    },
    error: function(e) {
      console.log("Error " + JSON.stringify(e))
    }  
  });
}

class BookingHistory extends Component {

  constructor(props) {
    super(props);
    
    this.state = {
      detailsVisible: false
    }
  }

  render({changeLog}) {
    var result = null;
    if (changeLog && changeLog.length > 0) {
      result = h('span', {
        className:'glyphicon glyphicon-list',
        'data-toggle':'tooltip',
        'data-placement':'right',
        title: changeLog.map(({ timestamp, owner }) => timestamp.substring(0,16) + " " + owner).join('</br>')
      })
    }
    return result; 
  }
}

class BookingsRow extends Component {
  constructor(props) {
    super(props);    
    
    this.state = {
       owner: this.props.booking.owner         
    };     
  }
  
  render({booking, handleClick, handleMouseOver, handleKeyUp, handleChange}, state) {
    return h('tr', {onMouseOver: () => handleMouseOver(booking)}, [
            h('td', { width:'30px'}, [
              booking.selected ? 
                h('a', {
                  href:'#',
                  onClick: () => handleClick(booking)
                }, [h('span', { className:'glyphicon glyphicon-edit' }, null)])                
                : null
              ]),
            h('td', { width:'120px'}, booking.date),
            h('td', { width:'300px'}, 
              h('div', {}, [
                !booking.editable ? state.owner : 
                  h('input', { 
                    style: { width:'100%', padding:'2px' },
                    type:'text', 
                    value:state.owner,
                    onkeyup: (e) => { this.setState({ owner: e.target.value}); handleKeyUp(e, booking) },
                    onchange: (e) => handleChange(e, booking),
                  }, []),
                
              ])
            ),
            h('td', {width:'200px'}, [h(BookingHistory, { changeLog:booking.changeLog })])
          ]    
        );    
  }
}

const BookingsTable = ({bookings, handleClick, handleMouseOver, handleKeyUp, handleChange }) => 
    h('table', 
      { className: 'table table-striped'}, 
      [
        h('thead', null, [
          h('tr', null, [
            h('th', null, " "),
            h('th', null, "date"),
            h('th', null, "owner"),
            h('th', null, "history")
          ])
        ]),
        h('tbody', null, 
          bookings.map((booking => h(BookingsRow, { booking, handleClick, handleMouseOver, handleKeyUp, handleChange })))
        )
      ]
     )

class App extends Component {
  constructor(props) {
    super(props);    
    
    this.state = {
       bookingsX: this.props.bookings.map(b => ({ 
         id:b.id, 
         owner:b.owner, 
         changeLog:b.changeLog, 
         date:b.date, 
         editable:false,
         selected:false
         
       }))
    };    
    
    this.handleBookingClicked = this.handleBookingClicked.bind(this);
    this.handleMouseOverBooking = this.handleMouseOverBooking.bind(this);
    this.handleKeyUpBooking = this.handleKeyUpBooking.bind(this);
    this.handleBookingChanged = this.handleBookingChanged.bind(this);
  }
  
  merge(obj1, obj2)
  {
    for (var attrname in obj2) { 
      obj1[attrname] = obj2[attrname]; 
    }
  }
      
  updateBookings(id, idFunc, nonIdFunc)
  {
      this.setState(({bookingsX}) => {
        bookingsX: bookingsX.map(b => {
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
  
  handleBookingClicked(argBooking) {  
    this.updateBookings(
      argBooking.id,
      (b) => ({ editable: !b.editable }),
      (b) => ({ editable: false })
    );                 
  }
  
  handleMouseOverBooking(argBooking) {
    this.updateBookings(
      argBooking.id,
      (b) => ({ selected: true }),
      (b) => ({ selected: false })
    );                 
  }
  
  handleKeyUpBooking(e,argBooking) {
    //console.log('keyup.... ' + Object.keys(val));
    if (e.keyCode == 13) {
      this.updateBookings(
        argBooking.id,
        (b) => ({ owner: e.target.value, editable: false }),
        (b) => ({ })
      );                 
    }
  }
  
  handleBookingChanged(e,argBooking) {
      console.log("handle change " + e.target.value)
      
      const addEntryToChangeLog = function(b) {
        const entry = {timestamp:new Date().toLocaleString(), owner:b.owner};
        if (b.changeLog) {
          return b.changeLog.concat([entry]);
        }
        else {
          return [entry]
        }
      }
      
      this.updateBookings(
        argBooking.id,
        (b) => ({ owner: e.target.value, changeLog: addEntryToChangeLog(b) })
      );    
      storeBooking(argBooking);
  }
  
  componentDidUpdate() {
    $('[data-toggle="tooltip"]').tooltip({ html: true }); 
  }
  
  render(props, state) {
    return h('div', {className: 'app'}, [
      h(BookingsTable, { 
        bookings: state.bookingsX, 
        handleClick: this.handleBookingClicked, 
        handleMouseOver:this.handleMouseOverBooking,
        handleKeyUp:this.handleKeyUpBooking,
        handleChange:this.handleBookingChanged
      })
    ]);
  }  
}

// Entry point for application
(function start() {
   fetchBookings().then(     
     bookings =>
       render(h(App, { bookings }), document.getElementById('root'))
   )
   ;
}());

