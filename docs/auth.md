# Authentication

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px">
<div>

### User login (/api/auth/login):

- When the user logs in, ensure that the provided schema is correct.  It should look like this:

  ```json
  {
    "username": "<username|email>",
    "password": "<password>"
  }
  ```

- If the schema is invalid, return an HTTP 400 status, with a VALIDATION_ERROR code.
- If the user is not found, or the password is invalid, return an HTTP 401 status with an
  INVALID_CREDENTIALS code.
- If the user's account is currently locked, return an HTTP 401 status with an 
  INVALID_CREDENTIALS code.
- If the user has required MFA on their account, a response containing the
  MFA code and available endpoints is returned:

  ```json
  {
    "status": "MFA_REQUIRED",
    "details": {
      "mfa_token": "<token>",
      "methods": [
        {
          "type": "sms",
          "endpoint": "/api/auth/mfa?type=sms"        
        }
      ]
    }
  }
  ```
- If the user has too many active sessions, return an HTTP 403 status with a
  TOO_MANY_SESSIONS code. The error details will include a temporary code that
  will allow the user to delete some active sessions.
- If all of the above checks pass, the user will be logged in, a new session
  will be created, and access and refresh tokens will be generated and returned
  in the `body.details` field:

  ```json
  {
    "status": "AUTHENTICATED",
    "details": {
      "access_token": "<token>",
      "refresh_token": "<token>"
    }
  }
  ```
- To access any protected resource in the system, the user must provide the access
  token in the Authentication header as follows:

  ```
  Authentication: Bearer <access_token>
  ```
- Access tokens will expire after 15 minutes. Users can get a new access token by
  hitting the /auth/refresh endpoint.

</div>
<div>

```mermaid
graph TD
    login(("User logs in")) --> correct_schema{"Schema correct?"}
    correct_schema -->|NO|invalid_schema_exception("Invalid schema")
    correct_schema -->|YES|correct_credentials{"Correct credentials?"}
    correct_credentials -->|NO|incorrect_login_exception("Invalid credentials")
    correct_credentials -->|YES|account_locked{"Account locked?"}
    account_locked -->|YES|account_locked_exception("Account locked")
    account_locked -->|NO|mfa_required{"MFA required?"}
    mfa_required -->|NO|too_many_sessions{"Session count exceeded?"}
    too_many_sessions -->|YES|too_many_sessions_exception("Too many sessions")
    too_many_sessions ==>|NO|login_success((("Login successful")))
    mfa_required -->|YES|return_mfa_code("MFA code provided")
    return_mfa_code ==> mfa_login("User continues login at /api/auth/mfa")
    exception("Throw exception")
    invalid_schema_exception --> exception
    incorrect_login_exception --> exception
    account_locked_exception --> exception
    too_many_sessions_exception --> exception
    return_tokens("Provide tokens")
    login_success --> return_tokens
```

</div>
</div>

### MFA Login (/api/auth/mfa?type=\<type\>):

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px">
<div>

- If the MFA type needs to send the user a code (such as with SMS), it
  can be accessed via POST request with the MFA token provided
  in the Auth header:

  ```
  Authentication: Bearer <mfa_token>
  ```

  A sample response is provided below:

  ```json
  {
    "status": "MFA_CHALLENGE_SENT",
    "details": {
      "type": "sms",
      "destination": "+1-***-***-3224",
      "expires_in": 300,
      "retry_after": 30
    }
  }
  ```

- If the endpoint is hit again with the same type and bearer token
  before the retry_after period has expired, an error will be 
  returned with HTTP status 429, and the code "MFA_RATE_EXCEEDED"
- If the token is malformed, the api will return an error with HTTP
  status 401 and code "INVALID_TOKEN"
- If the token is valid, but the user ID referenced in the sub claim
  is not found, the api will return an error with HTTP status
  401, and code "SESSION_NOT_FOUND"
- Once the user receives the code (either by sending a POST request
  to the endpoint to generate the code, or in the case of TOTP, by
  using an external authenticator app), they can log in by sending
  a POST request to the endpoint with the mfa_token passed as a 
  bearer token in the auth header:

  ```json
  {
    "code": "<code>"
  }
  ```

- If the code is invalid, the api will return an error with HTTP
  status 401, and code "INVALID_CREDENTIALS"
- If the code is valid, the server will complete the login
  and return the following payload with a 200 status:

  ```json
  {
    "status": "AUTHENTICATED",
    "details": {
      "access_token": "<token>",
      "refresh_token": "<token>"
    }
  }
  ```

</div>
<div>

```mermaid
graph TD
    post_to_endpoint(("Post to Endpoint")) --> contains_bearer_token{"Auth header contains bearer token?"}
    contains_bearer_token --> |NO|invalid_token_exception("Token invalid")
    contains_bearer_token --> |YES|token_valid{"Is the token valid?"}
    token_valid --> |NO|invalid_token_exception
    token_valid --> |YES|user_found{"Is the user found?"}
    user_found --> |NO|not_found_exception("Session not found")
    user_found --> |YES|contains_body{"Post contains requestBody"}
    contains_body --> |YES|schema_correct{"Is the schema correct?"}
    contains_body ==> |NO|return_mfa_challenge((("MFA challenge returned")))
    schema_correct --> |NO|incorrect_schema_exception("Incorrect schema sent")
    schema_correct --> |YES|code_correct{"Is the code correct?"}
    code_correct --> |NO|invalid_code_exception("Code is invalid")
    code_correct --> |YES|login_success((("Login successful")))
    exception("Throw exception")
    invalid_token_exception --> exception
    not_found_exception --> exception
    incorrect_schema_exception --> exception
    invalid_code_exception --> exception
    return_tokens("Provide tokens")
    login_success ==> return_tokens
    return_mfa_challenge --> post_to_endpoint
```

</div>
</div>