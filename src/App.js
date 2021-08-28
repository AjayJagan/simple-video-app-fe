import Login from './components/Login';
import Chat from './components/Chat';
import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";
function App() {
  return (
    <Router>
      <Switch>
      <Route path="/chat/:userName" component={Chat}/>
        <Route path="/">
          <Login />
        </Route>
      </Switch>
  </Router>
  );
}

export default App;
