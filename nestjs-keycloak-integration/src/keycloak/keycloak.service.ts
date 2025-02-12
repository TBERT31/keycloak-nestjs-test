import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NewUser } from "./model/new-user";
import { Credential, UserRepresentation } from "./dto/user-representation";
import { firstValueFrom } from "rxjs";
import { UpdateUser } from "./model/update-user";
import { RoleRepresentation } from "./dto/role-representation";

@Injectable()
export class KeycloakService{
    keycloakAdminUrl: string = this.configService.get<string>('keycloak_admin.baseURL');
    keycloakLoginUrl: string = this.configService.get<string>('keycloak.login_url');
    clientId: string = this.configService.get<string>('keycloak_admin.clientId');
    clientSecret: string = this.configService.get<string>('keycloak_admin.clientSecret');
    lifespan: string = this.configService.get<string>('keycloak_admin.linkLifeSpan');
    redirectUrl: string = this.configService.get<string>('keycloak_admin.clientRedirectUrl'); 

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ){}

    async createUser(newUser: NewUser): Promise<void>{

        try {
            let token = await this.getToken();
            let user: UserRepresentation = new UserRepresentation(); 
            user.lastName = newUser.lastName;
            user.firstName = newUser.firstName;
            user.username = newUser.username;
            user.email = newUser.username;

            let credential: Credential = new Credential();
            credential.type = 'password';
            credential.temporary = false;
            credential.value = newUser.password;

            user.credentials = [credential];
            user.enabled = true;
            user.emailVerified = false;
            firstValueFrom(
                this.httpService.post(`${this.keycloakAdminUrl}/users`, 
                    user, 
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )
            );

            await this.sendVerificationEmail(user, token);

        } catch (error) {
            console.log(error);
            throw new Error('Failed to create a user : '+ error.message);
        }
    }


    async updateUser(updateUser: UpdateUser, userId: string): Promise<void>{

        try {
            let token = await this.getToken();

            firstValueFrom(
                this.httpService.put(`${this.keycloakAdminUrl}/users/${userId}`, 
                    updateUser, 
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )
            );
        } catch (error) {
            console.log(error);
            throw new Error('Failed to create a user : '+ error.message);
        }
    }

    private async getToken() {
        return await this.loginClient();
    }
    
    private async loginClient(): Promise<string> {
        const formData = new URLSearchParams();
        formData.append('client_id', this.clientId);
        formData.append('client_secret', this.clientSecret);
        formData.append('grant_type', 'client_credentials');
        try {
            const response = await firstValueFrom(
            this.httpService.post(this.keycloakLoginUrl, formData.toString(), {
                headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                },
            }),
            );
            const { access_token } = response.data;
            return access_token;
        } catch (error) {
            throw new Error(`Client login failed: ${error.message}`);
        }
    }
    
    async sendVerificationEmail(user: UserRepresentation, token: string){
        const users = await this.getUserByUserName(user, token);
        const userId = users[0].id;

        try {
            const params = new URLSearchParams({
                client_id: this.clientId,
                redirect_uri: this.redirectUrl,
            });

            const response = await firstValueFrom(
                this.httpService.put(
                    `${this.keycloakAdminUrl}/users/${userId}/send-verify-email?${params.toString()}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )
            )
        } catch (error) {
            console.log(error);
        }
    }

    async getUserByUserName(user: UserRepresentation, token: string): Promise<UserRepresentation[]>{

        const params = new URLSearchParams({
            first: '0',
            max: '1',
            exact: 'true',
            username: user.username,
        });

        const response = await firstValueFrom(
            this.httpService.get(
                `${this.keycloakAdminUrl}/users?${params.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )
        )

        return response.data;
    }

    async getRoleByName(name: string, token: string): Promise<RoleRepresentation>{

        const response = await firstValueFrom(
            this.httpService.get(
                `${this.keycloakAdminUrl}/roles?${name}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )
        )

        return response.data;
    }

    async assignRole(
        userId: string,
        keycloakRoles: RoleRepresentation[],
        token: string,
      ): Promise<void> {
        const url = `${this.keycloakAdminUrl}/users/${userId}/role-mappings/realm`;
    
        try {
          await firstValueFrom(
            this.httpService.post(
              url,
              keycloakRoles, // Request body containing roles
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              },
            ),
          );
        } catch (error) {
          throw new Error(
            `Failed to assign roles to user with ID ${userId}: ${error.message}`,
          );
        }
      }
    
      async removeUserRoles(
        userId: string,
        keycloakRoles: RoleRepresentation[],
        token: string,
      ): Promise<void> {
        const url = `${this.keycloakAdminUrl}/users/${userId}/role-mappings/realm`;
    
        try {
          await firstValueFrom(
            this.httpService.delete(url, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              data: keycloakRoles, // Request body containing roles
            }),
          );
        } catch (error) {
          throw new Error(
            `Failed to de-assign roles from user with ID ${userId}: ${error.message}`,
          );
        }
      }
    
}


