import * as cdk from "aws-cdk-lib";
import { SecretValue } from "aws-cdk-lib";
import { Construct } from "constructs";
import { createWorkoutSchema } from "../../workout/create-workout-dto";

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
    // Authorizer has to be attached to an api, this is a workaround
    api.root.addMethod("GET", undefined, {
      authorizer,
    });

    new cdk.CfnOutput(this, "UserApiId", {
      value: api.restApiId,
      exportName: "UserApiId",
    });

    new cdk.CfnOutput(this, "UserApiRootResourceId", {
      value: api.restApiRootResourceId,
      exportName: "UserApiRootResourceId",
    });
  }
}

export class UserStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = cdk.aws_apigateway.RestApi.fromRestApiAttributes(
      this,
      "ApiReference",
      {
        rootResourceId: cdk.Fn.importValue("UserApiRootResourceId"),
        restApiId: cdk.Fn.importValue("UserApiId"),
      }
    );

    const userAuthorizer = {
      authorizerId: cdk.Fn.importValue("UserAuthorizerId"),
      authorizationType: cdk.aws_apigateway.AuthorizationType.COGNITO,
    };

    const userTable = new cdk.aws_dynamodb.Table(this, "UserTable", {
      partitionKey: {
        name: "userId",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "item",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
    });

    const startFunction = new cdk.aws_lambda.Function(this, "StartFunction", {
      code: new cdk.aws_lambda.AssetCode("dist/user-info"),
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: "start-handler.handler",
    });

    userTable.grantReadWriteData(startFunction);

    api.root
      .addResource("user")
      .addMethod(
        "POST",
        new cdk.aws_apigateway.LambdaIntegration(startFunction),
        {
          authorizer: userAuthorizer,
        }
      );

    const createWorkoutFunction = new cdk.aws_lambda.Function(
      this,
      "CreateWorkoutFunction",
      {
        code: new cdk.aws_lambda.AssetCode("dist/workout"),
        runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
        handler: "create-workout-handler.handler",
        environment: {
          USER_TABLE_NAME: userTable.tableName,
        },
      }
    );

    userTable.grantWriteData(createWorkoutFunction);

    api.root
      .addResource("workout")
      .addMethod(
        "POST",
        new cdk.aws_apigateway.LambdaIntegration(createWorkoutFunction),
        {
          authorizer: userAuthorizer,
          requestValidator: new cdk.aws_apigateway.RequestValidator(
            this,
            "CreateWorkoutRequestValidator",
            { restApi: api, validateRequestBody: true }
          ),
          requestModels: {
            "application/json": new cdk.aws_apigateway.Model(
              this,
              "CreateWorkoutRequestModel",
              {
                schema: createWorkoutSchema as any,
                restApi: api,
              }
            ),
          },
        }
      );
  }
}
