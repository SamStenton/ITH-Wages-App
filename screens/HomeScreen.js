import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  FlatList,
  SafeAreaView,
  RefreshControl,
  Button
} from 'react-native';
import { NavigationEvents } from 'react-navigation';
import { getData } from '../shared/store';
import { premiums } from '../shared/premium';
import { BASE_URL } from 'react-native-dotenv'

export default class HomeScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isLoading: true, refreshing: false, hourly: 9.02}
  }

  static navigationOptions = {
    header: null,
  };

  async loadShifts() {
    const last = await getData('last_name');
    await fetch(`${BASE_URL}/php/personal-message/recipients.php`)
      .then(res => res.json())
      .then(people => people.filter(person => person.last_name == last))
      .then(person => this.setState({user: person[0]}));

    if(this.state.user) {
      return fetch(`${BASE_URL}/app/rota-rebuild/php/myShifts.php?input1=${this.state.weekNo}&token=${this.state.user.user_id}`)
        .then(res => res.json())
        .then(response => Object.keys(response["content"]).map(key => response["content"][key]))
        .then(shifts => shifts.map(shift => {
          // Premium time starts at 18:30
          const premiumTime = new Date('1970-01-01T18:30:00Z');

          // Shift Times
          const startTime = new Date('1970-01-01T' + shift['start_time'] + 'Z');
          let endTime = new Date('1970-01-01T' + shift['end_time'] + 'Z');

          // If Midnight
          if (endTime.getTime() == (new Date('1970-01-01T23:59:00.000Z').getTime())) {
            endTime.setHours(24, 0, 0, 0); 
          }

          const difference = endTime.getTime() - startTime.getTime();

          // Calculate how many premium hours this shift contains
          shift.premiumHours = 0;
          if (endTime > premiumTime) {
            const premiumDifference = endTime.getTime() - premiumTime.getTime();
            shift.premiumHours = ((premiumDifference / 1000 / 60 / 10) * 10) / 60;
          }

          // Get the hours difference between the start and end times
          shift.gross = ((difference / 1000 / 60 / 10) * 10) / 60;

          return shift;
        }))
        .then(shifts => shifts.map(shift => {
          // Get Saturday/Sunday Multiplyers
          const multiplyer = {
            'Saturday': () => 1.5,
            'Sunday': () => 2,
            'default': () => 1,
          }
          shift.multiplyer = (multiplyer[shift.day] || multiplyer['default'])()
          // TODO: Calculate bank holidays use .gov api
          return shift;
        }))
        .then(shifts => shifts.map(shift => {
          // Calculate earnings for the shift with weekend multiplyers included
          shift.earnings = parseFloat(Number((shift.gross * this.state.hourly) * shift.multiplyer, 2).toFixed(2));
          return shift;
        }))
        .then(computed => {
          this.setState({
            isLoading: false,
            shifts: computed,
          })
        })
    }

    return [];
  }

  /**
   * Get the total Earnings
   */
  shiftsTotal() {
    if(this.state.shifts) {
      return Number(this.state.shifts.map(shift => shift.earnings).reduce((acc, val) => acc + val) + this.getPremiumPay()).toFixed(2);
    }
    return null;
  }

  shiftHoursTotal() {
    if (this.state.shifts) {
      return this.state.shifts.map(shift => shift.gross).reduce((acc, val) => acc + val);
    }
    return null;
  }


  premiumHoursTotal() {
    if (this.state.shifts) {
      return this.state.shifts.map(shift => shift.premiumHours).reduce((acc, val) => acc + val);
    }
    return 0;
  }

  getPremiumPay() {
    if(this.state.shifts) {
      const availablePremiums = (premiums[Math.floor(this.shiftHoursTotal())] || []).filter(premium => premium.hours <= this.premiumHoursTotal());

      if(availablePremiums.length > 0) {
        return Math.round(this.shiftHoursTotal() * availablePremiums.pop().premium * this.state.hourly * 100) / 100;
      }
    }
    return 0;
  }
  
  async setCurrentWeek() {
    const week = await fetch(`${BASE_URL}/php/dashboard/shifts.php`)
      .then(res => res.text())
      .then(res => JSON.parse(res.match(/\{(.*?)\}/g)[0]).week + 60);

    return this.setState({ weekNo: week });
  }

  async componentWillMount() {
    await this.setCurrentWeek();
    return this.loadShifts();
  }

  componentDidUpdate(prevProps, prevState) {
    if(prevState.weekNo !== this.state.weekNo) {
      this.loadShifts();
    }
  }

  _onRefresh = () => {
    this.setState({ refreshing: true });
    this.loadShifts().then(() => {
      this.setState({ refreshing: false });
    });
  }

  render() {
    return (
      <SafeAreaView style={styles.droidSafeArea}>
          <View style={{flex: 1}}>
            <View style={styles.header}>
            <Text style={styles.username}>{this.state.user ? this.state.user.last_name : 'Loading'}</Text>
              <Text style={styles.money}>£{this.shiftsTotal()}</Text>
            <NavigationEvents
              onWillFocus={payload => this.loadShifts()}
            />
            <Text>Week: {this.state.weekNo - 60}</Text>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'black'}}> 
              <Button
                onPress={() => { this.setState({ weekNo: this.state.weekNo - 1 }) }}
                title="Previous"
              />
              <Button
                onPress={() => { this.setCurrentWeek() }}
                title="Current"
              />
              <Button
                onPress={() => { this.setState({ weekNo: this.state.weekNo + 1 }) }}
                title="Next"
              />
            </View>
            <View>
          </View>
            </View>
            <View style={styles.content}>
            <ScrollView style={styles.container}>
              <Text>Total Hours: {this.shiftHoursTotal()}</Text>
              <Text>Premium hours: {this.premiumHoursTotal()}</Text>
              <Text>Premium pay: £{this.getPremiumPay()}</Text>
              <FlatList
                data={this.state.shifts}
                renderItem={({ item }) => {
                  return (
                    <View style={{ margin: 5, flex: 1, flexDirection: 'row', padding: 10, alignItems: 'center'}}>
                      <Text style={{ flex: 2, fontSize: 20}}>{item.day}</Text>
                      <Text style={{ flex: 1 }}>{item.long_name}</Text>
                      <Text style={{ flex: 1 }}>{item.start_time} - {item.end_time}</Text>
                      <Text style={{ flex: 1 }}>£{item.earnings}</Text>
                    </View>
                  )
                }
              }
                keyExtractor={(item, index) => index.toString()}
              />
            </ScrollView>
            </View>
          </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'skyblue',
  },

  header: {
    flex: 1,
    backgroundColor: '#e0406c',
    alignItems: 'center',
    color: '#fff',
    fontSize: 25,
  },

  username: {
    fontSize: 45,
  },

  money: {
    fontSize: 30,
  },

  content: {
    flex: 3
  },

  contentContainer: {
    paddingTop: 30,
  },

  tabBarInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...Platform.select({
      ios: {
        shadowColor: 'black',
        shadowOffset: { height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 20,
      },
    }),
    alignItems: 'center',
    backgroundColor: '#fbfbfb',
    paddingVertical: 20,
  },
  tabBarInfoText: {
    fontSize: 17,
    color: 'rgba(96,100,109, 1)',
    textAlign: 'center',
  },
  navigationFilename: {
    marginTop: 5,
  },
  helpContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  helpLink: {
    paddingVertical: 15,
  },
  helpLinkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
  
  droidSafeArea: {
    flex: 1,
    backgroundColor: '#e0406c',
    paddingTop: Platform.OS === 'android' ? 50 : 0
  },
});
