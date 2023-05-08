import * as cdk from "aws-cdk-lib";
import { SecretValue } from "aws-cdk-lib";
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

    userPool.addDomain("UserPoolDomain", {
      cognitoDomain: {
        domainPrefix: "workout-user",
      },
    });

    const indexFilename = "oauth-redirect.html";

    const redirectBucket = new cdk.aws_s3.Bucket(this, "RedirectBucket", {
      accessControl: cdk.aws_s3.BucketAccessControl.PRIVATE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new cdk.aws_s3_deployment.BucketDeployment(this, "DeployRedirectIndex", {
      sources: [cdk.aws_s3_deployment.Source.asset("./public")],
      destinationBucket: redirectBucket,
    });

    const originAccessIdentity = new cdk.aws_cloudfront.OriginAccessIdentity(
      this,
      "OriginAccess"
    );
    redirectBucket.grantRead(originAccessIdentity);

    const redirectDist = new cdk.aws_cloudfront.Distribution(
      this,
      "RedirectDistribution",
      {
        defaultRootObject: indexFilename,
        defaultBehavior: {
          origin: new cdk.aws_cloudfront_origins.S3Origin(redirectBucket, {
            originAccessIdentity,
          }),
        },
      }
    );

    userPool.addClient("LoginClient", {
      supportedIdentityProviders: [
        cdk.aws_cognito.UserPoolClientIdentityProvider.COGNITO,
        cdk.aws_cognito.UserPoolClientIdentityProvider.GOOGLE,
      ],
      oAuth: {
        callbackUrls: [`https://${redirectDist.distributionDomainName}`],
      },
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
