import React from 'react';
import { Text, TextInput, Button, View} from 'react-native';

import { putData } from '../shared/store';

export default class SettingsScreen extends React.Component {
  static navigationOptions = {
    title: 'Settings',
  };

  save(data) {
    Object.keys(data).forEach(key => putData(key, data[key]));
  }

  clearData() {

  }

  render() {
    /* Go ahead and delete ExpoConfigView and replace it with your
     * content, we just wanted to give you a quick view of your config */
    return (
      <View style={{ flex: 1 }}>
        <TextInput
          style={{ height: 40 }}
          placeholder="Last Name"
          onChangeText={(text) => this.save({ last_name: text })}
        />
        <Button
          onPress={() => { this.clearData() }}
          title="Save"
        />
        <Button
          style={{ flex: 1, alignSelf: 'center' }}
          onPress={() => { this.clearData() }}
          title="Clear All Data"
        />
      </View>
    )
  }
}
