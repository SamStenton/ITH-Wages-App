import { AsyncStorage } from "react-native"

const put = (key, value) => {
  try {
    return AsyncStorage.setItem(`@ithshifts:${key}`, value);
  } catch (error) {
    // Error saving data
  }
}


const get = (key) => {
  try {
    return AsyncStorage.getItem(`@ithshifts:${key}`);
  } catch (error) {
    return null;
  }
}

const clearAll = () => {

}

export { put as putData, get as getData }