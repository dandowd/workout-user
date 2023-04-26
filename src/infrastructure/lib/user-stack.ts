import * as cdk from "aws-cdk-lib";
import { SecretValue } from "aws-cdk-lib";
import { Construct } from "constructs";

export class UserStack extends cdk.Stack {
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
    });

    new cdk.aws_cognito.UserPoolIdentityProviderGoogle(
      this,
      "GoogleIdProvider",
      {
        userPool,
        clientId:
          "69790275993-vvpfap89obu9pno4soikkngr24q52gs6.apps.googleusercontent.com",
        clientSecretValue: SecretValue.secretsManager(
          "arn:aws:secretsmanager:us-east-1:589332345969:secret:staging/workout/google/idProvider-SXUXnE"
        ),
      }
    );

    const authorizer = new cdk.aws_apigateway.CognitoUserPoolsAuthorizer(
      this,
      "Authorizer",
      {
        cognitoUserPools: [userPool],
      }
    );

    new cdk.CfnOutput(this, "UserAuthorizerId", {
      value: authorizer.authorizerId,
      exportName: "UserAuthorizerId",
    });

    const api = new cdk.aws_apigateway.RestApi(this, "UserApi", {});

    new cdk.CfnOutput(this, "UserApiId", {
      value: api.restApiId,
      exportName: "UserApiId",
    });

    new cdk.CfnOutput(this, "UserApiRootResourceId", {
      value: api.restApiRootResourceId,
      exportName: "UserApiRootResourceId",
    });

    const userTable = new cdk.aws_dynamodb.Table(this, "UserTable", {
      partitionKey: { name: "id", type: cdk.aws_dynamodb.AttributeType.STRING },
    });

    const startFunction = new cdk.aws_lambda.Function(this, "StartFunction", {
      code: new cdk.aws_lambda.AssetCode("dist"),
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: "start.handler",
    });

    userTable.grantReadWriteData(startFunction);

    api.root
      .addResource("user")
      .addMethod(
        "POST",
        new cdk.aws_apigateway.LambdaIntegration(startFunction),
        {
          authorizer,
        }
      );
  }
}
