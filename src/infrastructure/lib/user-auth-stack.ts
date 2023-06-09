import * as cdk from "aws-cdk-lib";
import { SecretValue } from "aws-cdk-lib";
import { MockIntegration } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

export class UserAuthStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new cdk.aws_cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      // sign-in can't be changed after creation
      signInAliases: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      mfa: cdk.aws_cognito.Mfa.OFF,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new cdk.aws_cognito.UserPoolIdentityProviderGoogle(
      this,
      "GoogleIdProvider",
      {
        userPool,
        attributeMapping: {
          email: cdk.aws_cognito.ProviderAttribute.GOOGLE_EMAIL,
        },
        scopes: ["email"],
        clientId:
          "69790275993-vvpfap89obu9pno4soikkngr24q52gs6.apps.googleusercontent.com",
        clientSecretValue: SecretValue.secretsManager(
          "arn:aws:secretsmanager:us-east-1:589332345969:secret:staging/workout/google/idProvider-SXUXnE"
        ),
      }
    );

    new cdk.aws_cognito.UserPoolResourceServer(this, "UserPoolResourceServer", {
      userPool,
      identifier: "com.workout",
      scopes: [
        {
          scopeName: "user",
          scopeDescription: "User scope",
        },
      ],
    });

    userPool.addDomain("UserPoolDomain", {
      cognitoDomain: {
        domainPrefix: "workout-user",
      },
    });

    userPool.addClient("LoginClient", {
      supportedIdentityProviders: [
        cdk.aws_cognito.UserPoolClientIdentityProvider.COGNITO,
        cdk.aws_cognito.UserPoolClientIdentityProvider.GOOGLE,
      ],
      oAuth: {
        callbackUrls: ["exp://192.168.50.101:19000/--/auth", "myapp://auth"],
        scopes: [cdk.aws_cognito.OAuthScope.custom("com.workout/user")],
      },
    });

    const authorizer = new cdk.aws_apigateway.CognitoUserPoolsAuthorizer(
      this,
      "Authorizer",
      {
        cognitoUserPools: [userPool],
        identitySource:
          cdk.aws_apigateway.IdentitySource.header("Authorization"),
      }
    );

    new cdk.CfnOutput(this, "UserAuthorizerId", {
      value: authorizer.authorizerId,
      exportName: "UserAuthorizerId",
    });

    const api = new cdk.aws_apigateway.RestApi(this, "PublicGateway", {
      defaultMethodOptions: {
        authorizer,
        authorizationScopes: ["com.workout/user"],
      },
    });

    const apiRoot = api.root.addResource("api");

    // Authorizer has to be attached to an api, this is a workaround
    api.root.addMethod("ANY", new MockIntegration());

    new cdk.CfnOutput(this, "PublicApiId", {
      value: api.restApiId,
      exportName: "PublicApiId",
    });

    new cdk.CfnOutput(this, "ApiResourceId", {
      value: apiRoot.resourceId,
      exportName: "ApiResourceId",
    });

    new cdk.CfnOutput(this, "PublicApiRootResourceId", {
      value: api.restApiRootResourceId,
      exportName: "PublicApiRootResourceId",
    });
  }
}
