<template>
  <div class="hello">
    <h1>Please enter your OTP</h1>
    <form v-bind="{ action: continueUrl }" method="post">
      <input type="number" id="otp" name="otp">
      <input type="submit" name="verify" value="Verify" class="inputButton">
    </form>
  </div>
</template>

<script>
  // retrieve and store state in sessionStorage
  let urlParams = new URLSearchParams(window.location.search);
  let state = urlParams.get('state');
  console.info('state: ' + state);

  export default {
    name: 'CollectOtp',
    props: {
      msg: String
    },
    data: () => {
      let continueUrl = `https://aa-aad-poc.au.auth0.com/continue?state=${state}`;
      return {
        continueUrl
      }
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  h3 {
    margin: 40px 0 0;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }

  li {
    display: inline-block;
    margin: 0 10px;
  }

  a {
    color: #42b983;
  }

  .inputButton {
    background-color: #4CAF50;
    /* Green */
    border: none;
    color: white;
    padding: 10px 20px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 14px;
    margin: 4px 2px;
  }
</style>